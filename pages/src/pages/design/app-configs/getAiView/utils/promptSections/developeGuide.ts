export default {
  /** 总体开发规则、画布宽度、页面/弹窗拆分等基础规范 */
  firstOfAll: `- 开发宪章
> 参考「开发指南」+「源代码」进行代码开发任务，必须遵循「最佳实践」和「设计规范」，在编写各类型文件时，按照「文件编写规范」完成代码任务；JSDoc 注释属于代码的一部分，需要在编写节点代码时同步维护；完成代码任务后，遵循「文档规范」同步 requirement.md。

- 总体规则
  - 功能：生产级别的功能性；
  - 细节：在每个细节都精心完善；
  - 响应式：ui需要适应不同尺寸画布，保证在不同缩放比例下都能正常显示内容；
- 拆分逻辑
  - 以功能卡片维度来编写前端组件；`,
  /** 图标与图片资源的使用规范 */
  // assetsUsageSection: '',
  /** 项目目录结构、jsx/less/store 等文件编写规范 */
  architectureSection: `\`\`\`
├─ frontend                           # 前端卡片代码目录
|  ├─ components                      # 可选，跨卡片可复用组件，封装在此目录统一管理
|  ├─ {分类名}                         # 按业务分类组织，例如 user、order、product 等
|  |  ├─ components                   # 可选，该分类下的可复用组件，封装在此目录统一管理
|  |  ├─ {功能名}                      # 该分类下具体的功能卡片，例如 UserProfile、OrderList
|  |  |  ├─ index.tsx                 # 必选，卡片组件入口，导出默认 React 组件
|  |  |  ├─ index.module.less         # 可选，卡片样式文件，使用 CSS Modules
|  |  |  ├─ {子组件名}.tsx             # 可选，当 index.tsx 中组件过多时，适当拆分为同级子组件文件
|  |  |  ├─ {子组件名}.module.less     # 可选，子组件样式文件，使用 CSS Modules
|  |  ├─ dataSource.ts                # 必选，前端数据源，项目唯一文件，必须，调用本项目服务端使用 /api/xxx 路径调用
|  |  └─ ...                          # 其他功能卡片目录
|  └─ ...                             # 其他分类目录
├─ backend                            # 必选，服务端代码入口，自动渲染MyBricks 前端项目
|  ├─ index.ts                        # 必选，服务入口，在这里创建 Hono app
|  ├─ db.ts                           # 可选，数据库连接文件，仅在需要数据库时创建
|  ├─ routes                          # 可选，按业务域和路由拆分，一个文件一个业务路由，比如 /api/user 存放到 user.ts中 
|  |  └── user.ts
\`\`\`

### tsx 文件编写规范
1. 必须使用 TypeScript，所有组件 props、state、函数参数和返回值都需要有明确的类型定义；
2. 组件状态和业务逻辑封装在组件内部，使用 useState、useReducer 等 React hooks 管理状态；
3. 当逻辑相对独立或较为复杂时，抽取到同级 \`hooks/\` 文件夹中，每个自定义 hook 单独一个文件；
4. 禁止编写未实现的事件函数；
5. 对于浮层类组件，如弹窗、抽屉等，控制浮层显示状态的变量使用 useState 维护，禁止设置为固定值；
6. 所有来自三方库的组件和所有 html 元素都必须带有语义化明确且唯一的 className；
7. 禁止出现直接引用标签的写法，例如 \`<Tags[XX] property={'aa'}/>\`，正确写法是先定义 \`const XX = Tag[XX]; <XX property={'aa'}/>\`；
8. 所有列表中的组件必须通过 key 属性做唯一标识，不要使用 index 作为 key；
9. 前端调用本项目服务端接口时，统一在 \`dataSource.ts\` 中通过 MyBricks DataSource 的 \`this.axios\` 调用相对路径 \`api/xxx\` 请求。

### less 文件编写规范
1. 样式文件命名规则：\`*.module.less\` 编译时自动启用 CSS Module，\`*.less\` 编译时不开启 CSS Module；
2. 开发优先统一使用 \`*.module.less\` 编写样式；
3. 选择器中多个单词之间使用驼峰方式，不能使用 - 连接；
4. 不使用 :before、:after 等伪类选择器来实现 dom。

### hooks 文件夹编写规范
- hooks 以文件夹形式存放，目录名必须是 \`hooks\`；
- 每个 hook 单独一个文件，文件名与 hook 名相同，如 \`useXxx.ts\`；
- 每个自定义 hook 以 \`use\` 开头命名；
- hook 应内部管理自己的副作用，不对外暴露命令式方法；
- 当多个组件需要共享逻辑时，提取到上层公共 \`hooks/\` 目录中。

### 日志规范
项目中必须使用 mybricks 提供的 \`logger\` 工具打印前端日志，禁止使用 console.log / console.warn / console.error 等原生方法。

必须在以下场景打印足量日志：
1. 用户交互事件；
2. 数据请求；
3. 状态变更；
4. 条件分支与异常；
5. 路由跳转；
6. 任何可能失败的操作。

### 服务端编写规范
当前项目支持使用 Hono 进行服务端开发。涉及数据库时，先通过工具确认数据库表结构，再在服务端代码中编写查询、写入和接口逻辑。
1. 后端接口路径统一挂在 \`api\` scope 下，例如 \`/api/todos\`、\`/api/users/:id\`；前端在 \`dataSource.ts\` 中直接通过 \`this.axios.get('api/todos')\` 来调用，必须是api相对路径。
2. 服务端返回统一使用 JSON，成功返回 \`{ result: 1, error_msg: 'success', data }\`，失败返回 \`{ result: -1, error_msg: '失败原因' }\`，并设置合理 HTTP 状态码。
3. 路由处理函数中必须做好参数校验和异常捕获，避免未处理异常直接暴露给用户。
4. 服务端需要访问数据库时，使用 \`mysql2/promise\` 包的 \`createPool\`，连接配置从 \`process.env.db\` 读取；数据库表结构由工具调用进行准备，业务代码只负责查询和写入，不要在接口处理函数中执行建表逻辑。
5. 路由拆分参考 Express Router 的思路：每个业务路由文件导出一个独立 router，入口文件只负责统一挂载，不要把所有接口都写进 \`backend/index.ts\`。

### 服务端示例
1.入口文件
\`\`\`ts
import { Hono } from 'hono';
import todoRoutes from './routes/todo';

const app = new Hono();

app.route('/api/todos', todoRoutes);

export default app;
\`\`\`

2.数据库文件
\`\`\`ts
import { createPool } from 'mysql2/promise';

export const pool = createPool({
  host: process.env.db.host,
  port: process.env.db.port,
  user: process.env.db.user,
  password: process.env.db.password,
  database: process.env.db.database,
});
\`\`\`

3.业务路由todo.ts
\`\`\`ts
import { Hono } from 'hono';
import { pool } from '../db';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const todoRoutes = new Hono();

todoRoutes.get('/', async (c) => {
  try {
    const result = await pool.query<Todo>(
      'SELECT id, title, completed FROM todos ORDER BY id DESC'
    );

    return c.json({ result: 1, error_msg: 'success', data: result.rows });
  } catch (error) {
    return c.json({ result: -1, error_msg: '查询任务列表失败' }, 500);
  }
});

export default todoRoutes;
\`\`\`
  `,
  /** 示例代码块，展示典型开发模式 */
  examplesSection: `
<example>
  <user_query>开发一个产品列表卡片，展示产品名称、价格、库存，支持收藏操作</user_query>
  <assistant_response>
  好的，我将按照前端卡片规范，在 \`frontend/product/ProductList/\` 目录下创建产品列表卡片组件。

  卡片包含：产品信息展示（名称、价格、库存状态）、收藏按钮（点击切换收藏状态并打印日志）。

  \`\`\`tsx
  // frontend/product/ProductList/index.tsx
  import { useState } from 'react';
  import { logger } from 'mybricks';
  import css from './index.module.less';

  interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
  }

  const mockProducts: Product[] = [
    { id: 'p001', name: '无线蓝牙耳机', price: 299, stock: 128 },
    { id: 'p002', name: '机械键盘', price: 599, stock: 0 },
    { id: 'p003', name: '人体工学椅', price: 1299, stock: 45 },
  ];

  interface ProductCardProps {
    product: Product;
    isFavorited: boolean;
    onToggleFavorite: (id: string) => void;
  }

  const ProductCard = ({ product, isFavorited, onToggleFavorite }: ProductCardProps) => {
    const isOutOfStock = product.stock === 0;

    return (
      <div className={css.productCard}>
        <div className={css.productInfo}>
          <span className={css.productName}>{product.name}</span>
          <span className={css.productPrice}>¥{product.price.toFixed(2)}</span>
          <span className={isOutOfStock ? css.stockOut : css.stockIn}>
            {isOutOfStock ? '已售罄' : \`库存 \${product.stock}\`}
          </span>
        </div>
        <button
          className={isFavorited ? css.favoriteActive : css.favorite}
          onClick={() => {
            logger.info(\`[ProductList/onToggleFavorite] 切换收藏状态 id=\${product.id} current=\${isFavorited}\`);
            onToggleFavorite(product.id);
          }}
        >
          {isFavorited ? '★ 已收藏' : '☆ 收藏'}
        </button>
      </div>
    );
  };

  export default function ProductList() {
    const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

    const handleToggleFavorite = (id: string) => {
      setFavoritedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          logger.info(\`[ProductList] 取消收藏 id=\${id}\`);
        } else {
          next.add(id);
          logger.info(\`[ProductList] 添加收藏 id=\${id}\`);
        }
        return next;
      });
    };

    return (
      <div className={css.productList}>
        <h2 className={css.listTitle}>产品列表</h2>
        {mockProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            isFavorited={favoritedIds.has(product.id)}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
    );
  }
  \`\`\`

  \`\`\`less
  /* frontend/product/ProductList/index.module.less */
  .productList {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .listTitle {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 8px;
  }

  .productCard {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    background: #fff;
    transition: box-shadow 0.2s;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
  }

  .productInfo {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .productName {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }

  .productPrice {
    font-size: 15px;
    color: #e85c00;
    font-weight: 600;
  }

  .stockIn {
    font-size: 12px;
    color: #52c41a;
  }

  .stockOut {
    font-size: 12px;
    color: #999;
  }

  .favorite {
    padding: 6px 14px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #fff;
    color: #666;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #faad14;
      color: #faad14;
    }
  }

  .favoriteActive {
    padding: 6px 14px;
    border: 1px solid #faad14;
    border-radius: 4px;
    background: #fffbe6;
    color: #faad14;
    font-size: 13px;
    cursor: pointer;
  }
  \`\`\`

  已完成产品列表卡片开发：
  - 文件位于 \`frontend/product/ProductList/\`，遵循「分类名/功能名」两层目录规范；
  - 收藏状态通过 \`useState<Set<string>>\` 管理，不使用固定值；
  - 所有用户交互均通过 \`logger.info\` 打印日志，格式为 \`[组件/事件] 描述\`；
  - 列表渲染以 \`product.id\` 作为 key，不使用 index；
  - 所有元素均带有语义化唯一 className，样式使用 \`*.module.less\` CSS Modules；
  - 子组件 \`ProductCard\` props 有完整 TypeScript 类型定义。
  </assistant_response>
</example>
`,
  /** 追加到本节末尾 */
  end: ''
}
