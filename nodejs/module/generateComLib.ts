import { APPType } from './types'
export const generateComLib = (allComLibs: any[], allComponents: any[], options: { comLibId: number; noThrowError: boolean, appType: APPType }) => {
	const { comLibId, noThrowError, appType = APPType.React } = options;
	let script = '';

	allComponents.forEach(component => {
		let lib = allComLibs.find(lib => lib.componentRuntimeMap[component.namespace + '@' + component.version]);
		let curComponent = null;
		if (lib) {
			curComponent = lib.componentRuntimeMap[component.namespace + '@' + component.version];
		} else {
			lib = allComLibs.find(lib => Object.keys(lib.componentRuntimeMap).find(key => key.startsWith(component.namespace)));

			if (!lib) {
				if (noThrowError) {
					return;
				} else {
					throw new Error(`找不到 ${component.namespace}@${component.version} 对应的组件资源`);
				}
			}
			curComponent = lib.componentRuntimeMap[Object.keys(lib.componentRuntimeMap).find(key => key.startsWith(component.namespace))];
		}

		if (!curComponent) {
			if (noThrowError) {
				return;
			} else {
				throw new Error(`找不到 ${component.namespace}@${component.version} 对应的组件资源`);
			}
		}

		let componentRuntime = ''
		switch (true) {
			case appType === APPType.React: {
				componentRuntime = curComponent.runtime;
				break
			}

			case appType === APPType.Vue2: {
				componentRuntime = curComponent['runtime.vue'] ?? curComponent.runtime;
				break
			}

			case appType === APPType.Vue3: {
				componentRuntime = curComponent['runtime.vue'] ?? curComponent.runtime;
				break
			}
		
			default: {
				componentRuntime = curComponent.runtime;
				break
			}
		}

		script += lib.defined ? `
			comAray.push({ namespace: '${component.namespace}', version: '${curComponent.version}', runtime: ${decodeURIComponent(componentRuntime)} });
		` : `
			eval(${JSON.stringify(decodeURIComponent(componentRuntime))});
			comAray.push({ namespace: '${component.namespace}', version: '${curComponent.version}', runtime: (window.fangzhouComDef || window.MybricksComDef).default });
			if(Reflect.has(window, 'fangzhouComDef')) Reflect.deleteProperty(window, 'fangzhouComDef');
			if(Reflect.has(window, 'MybricksComDef')) Reflect.deleteProperty(window, 'MybricksComDef');
		`;
		
	});

	return `
		(function() {
			let comlibList = window['__comlibs_rt_'];
			if(!comlibList){
				comlibList = window['__comlibs_rt_'] = [];
			}
			let comAray = [];
			comlibList.push({
				id: '${comLibId}',
				title: '页面${comLibId}的组件库',
				comAray,
				defined: true,
			});
			${script}
		})()
	`;
}