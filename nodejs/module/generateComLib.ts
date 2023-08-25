export const generateComLib = (allComLibs: any[], allComponents: any[], comLibId: number) => {
	let script = '';

	allComponents.forEach(component => {
		let lib = allComLibs.find(lib => lib[component.namespace + '@' + component.version]);
		let curComponent = null;
		if (lib) {
			curComponent = lib[component.namespace + '@' + component.version];
		} else {
			lib = allComLibs.find(lib => Object.keys(lib).find(key => key.startsWith(component.namespace)));

			if (!lib) {
				throw new Error(`找不到 ${component.namespace}@${component.version} 对应的组件资源`);
			}
			curComponent = lib[Object.keys(lib).find(key => key.startsWith(component.namespace))];
		}

		if (!curComponent) {
			throw new Error(`找不到 ${component.namespace}@${component.version} 对应的组件资源`);
		}

		script += `
			eval(${JSON.stringify(decodeURIComponent(curComponent.runtime))});
			comAray.push({ namespace: '${component.namespace}', version: '${curComponent.version}', runtime: window.fangzhouComDef.default });
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