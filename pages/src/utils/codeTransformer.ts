import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

export interface CodeFile {
  path: string;
  content: string;
}

/**
 * 代码转换器
 * 负责对输入的文件列表做各种转换处理，转换后原样返回。
 * 后续可在此类中扩展具体的转换逻辑（如 import 替换、样式抽取等）。
 */
export class CodeTransformer {
  /**
   * 入口：接收文件列表，逐个转换后返回。
   */
  transformFiles(files: CodeFile[]): CodeFile[] {
    return files.map((file) => this.transformSingleFile(file));
  }

  /**
   * 转换单个文件，只处理 tsx/ts 文件，其余原样返回。
   */
  private transformSingleFile(file: CodeFile): CodeFile {
    if (!this.isSupportedFile(file.path)) {
      return file;
    }

    try {
      const ast = this.parseCode(file.content);

      this.removePopupVisibleDecorators(ast);
      this.replaceLessImports(ast);
      this.replaceMybricksLogger(ast);
      this.removeMybricksRefWrappers(ast);
      this.replaceEnvVars(ast);
      this.replaceMyBricks(ast);
      if (file.path.endsWith('.tsx')) {
        this.ensureReactImport(ast);
      }

      const output = generate(
        ast,
        { retainLines: false, jsescOption: { minimal: true } },
        file.content,
      );
      return { path: file.path, content: output.code };
    } catch {
      // 解析失败时原样返回，避免破坏源文件
      return file;
    }
  }

  /**
   * 将从 'mybricks' 包引入的 logger 替换为 console：
   * 1. 删除 import 中的 logger 具名导入（若只剩 logger 则移除整个 import 声明）
   * 2. 将所有 logger.xxx(...) 调用替换为 console.xxx(...)
   */
  private replaceMybricksLogger(ast: t.File) {
    let hasLogger = false;

    traverse(ast, {
      // 第一步：处理 import { ..., logger, ... } from 'mybricks'
      ImportDeclaration(path) {
        if (path.node.source.value !== 'mybricks') return;

        const loggerSpecifierIndex = path.node.specifiers.findIndex(
          (s) => t.isImportSpecifier(s) && t.isIdentifier(s.local, { name: 'logger' }),
        );
        if (loggerSpecifierIndex === -1) return;

        hasLogger = true;

        if (path.node.specifiers.length === 1) {
          // 整个 import 只有 logger，直接移除整条 import 声明
          path.remove();
        } else {
          // 还有其他导入，只删除 logger 这个 specifier
          path.node.specifiers.splice(loggerSpecifierIndex, 1);
        }
      },
    });

    if (!hasLogger) return;

    traverse(ast, {
      // 第二步：将 logger.xxx(...) 替换为 console.xxx(...)
      CallExpression(path) {
        const callee = path.node.callee;
        if (t.isMemberExpression(callee) && t.isIdentifier(callee.object, { name: 'logger' })) {
          callee.object = t.identifier('console');
        }
      },
    });
  }

  /**
   * 移除 mybricks 的 ref 包装调用与对应导入。
   */
  private removeMybricksRefWrappers(ast: t.File) {
    const REF_NAMES = new Set(['appRef', 'comRef', 'popupRef']);

    traverse(ast, {
      ImportDeclaration(path) {
        if (path.node.source.value !== 'mybricks') return;

        path.node.specifiers = path.node.specifiers.filter(
          (s) =>
            !(t.isImportSpecifier(s) && t.isIdentifier(s.local) && REF_NAMES.has(s.local.name)),
        );

        if (path.node.specifiers.length === 0) {
          path.remove();
        }
      },
    });

    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee;
        if (t.isIdentifier(callee) && REF_NAMES.has(callee.name)) {
          if (path.node.arguments.length === 1) {
            path.replaceWith(path.node.arguments[0]);
          }
        }
      },
    });
  }

  /**
   * 移除导出代码里的 PopupVisible 装饰器。
   */
  private removePopupVisibleDecorators(ast: t.File) {
    traverse(ast, {
      Decorator(path) {
        const expression = path.node.expression;
        const isPopupVisibleDecorator =
          t.isIdentifier(expression, { name: 'PopupVisible' }) ||
          (t.isCallExpression(expression) && t.isIdentifier(expression.callee, { name: 'PopupVisible' }));

        if (isPopupVisibleDecorator) {
          path.remove();
        }
      },
    });
  }

  /**
   * 将带绑定的 less 导入改成 module less，保留副作用样式导入。
   */
  private replaceLessImports(ast: t.File) {
    traverse(ast, {
      ImportDeclaration(importPath: { node: t.ImportDeclaration }) {
        const sourceValue = importPath.node.source.value;
        if (!sourceValue.endsWith('.less')) return;
        if (sourceValue.endsWith('.module.less')) return;
        if (importPath.node.specifiers.length === 0) return;

        importPath.node.source = t.stringLiteral(sourceValue.replace(/\.less$/, '.module.less'));
      },
    });
  }

  /**
   * 为 tsx 文件补默认 React 导入。
   */
  private ensureReactImport(ast: t.File) {
    let hasReactDefaultImport = false;

    traverse(ast, {
      ImportDeclaration(path) {
        if (path.node.source.value !== 'react') return;
        const hasDefault = path.node.specifiers.some((s) => t.isImportDefaultSpecifier(s));
        if (hasDefault) hasReactDefaultImport = true;
      },
    });

    if (hasReactDefaultImport) return;

    const reactImport = t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier('React'))],
      t.stringLiteral('react'),
    );
    ast.program.body.unshift(reactImport);
  }

  /**
   * 替换约定的环境变量并尽量折叠静态分支。
   */
  private replaceEnvVars(ast: t.File) {
    type RawExpr = { __rawExpr: true; expr: string };

    const OBJECT_VALUES: Record<string, unknown> = {
      'process.env.POPUP_VISIBLE': false,
      'process.env.POPUP_NODE': { __rawExpr: true, expr: 'document.body' } as RawExpr,
    };
    const OBJECT_PATHS = Object.keys(OBJECT_VALUES);

    const buildRawExprNode = (raw: RawExpr): t.Expression => {
      const parts = raw.expr.split('.');
      let node: t.Expression = t.identifier(parts[0]);
      for (let i = 1; i < parts.length; i++) {
        node = t.memberExpression(node, t.identifier(parts[i]));
      }
      return node;
    };

    const replaceAndEvaluate = (nodePath: any, replacement: unknown) => {
      if (replacement && typeof replacement === 'object' && (replacement as RawExpr).__rawExpr) {
        nodePath.replaceWith(buildRawExprNode(replacement as RawExpr));
      } else {
        nodePath.replaceWith(t.valueToNode(replacement));
      }

      if (nodePath.parentPath?.isBinaryExpression()) {
        const result = nodePath.parentPath.evaluate();
        if (result.confident) {
          nodePath.parentPath.replaceWith(t.valueToNode(result.value));
        }
      }

      if (nodePath.parentPath?.isLogicalExpression()) {
        const logical = nodePath.parentPath;
        const { operator, left, right } = logical.node;
        const leftResult = logical.get('left').evaluate();
        if (leftResult.confident) {
          const leftVal = leftResult.value;
          if (operator === '||') {
            logical.replaceWith(leftVal ? left : right);
          } else if (operator === '&&') {
            logical.replaceWith(leftVal ? right : left);
          }
        }
      }

      if (nodePath.parentPath?.isIfStatement()) {
        const ifPath = nodePath.parentPath;
        const testResult = ifPath.get('test').evaluate();
        if (testResult.confident) {
          if (!testResult.value) {
            if (ifPath.node.alternate) {
              ifPath.replaceWith(ifPath.node.alternate);
            } else {
              ifPath.remove();
            }
          } else {
            ifPath.replaceWith(ifPath.node.consequent);
          }
        }
      }
    };

    traverse(ast, {
      MemberExpression(nodePath) {
        const matchedKey = OBJECT_PATHS.find((key) => nodePath.matchesPattern(key));
        if (matchedKey !== undefined && Object.prototype.hasOwnProperty.call(OBJECT_VALUES, matchedKey)) {
          replaceAndEvaluate(nodePath, OBJECT_VALUES[matchedKey]);
        }
      },
    });
  }
  
  private replaceMyBricks(ast: t.File) {
    traverse(ast, {
      // 1) import { xxx } from 'mybricks'  →  import { xxx } from '@mybricks/ai-render'
      ImportDeclaration(path) {
        if (path.node.source.value === 'mybricks') {
          path.node.source = t.stringLiteral('@mybricks/ai-render');
        }
      },

      // 2) require('mybricks')  →  require('@mybricks/ai-render')
      CallExpression(path) {
        const callee = path.node.callee;
        if (
          t.isIdentifier(callee, { name: 'require' }) &&
          path.node.arguments.length === 1 &&
          t.isStringLiteral(path.node.arguments[0], { value: 'mybricks' })
        ) {
          path.node.arguments[0] = t.stringLiteral('@mybricks/ai-render');
        }
      },
    });
  }

  /**
   * 解析源码为 Babel AST。
   */
  private parseCode(code: string): t.File {
    return parser.parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy'],
    });
  }

  /**
   * 判断当前文件是否需要参与转换。
   */
  private isSupportedFile(filePath: string): boolean {
    return /\.(tsx|jsx|ts|js)$/.test(filePath);
  }
}
