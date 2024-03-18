export default function (toJson: any, inputs: {}) {
    const keyDownEventList = toJson.scenes[0].outputs.filter(output => output.type === "shortcut");

    // 特殊按键ID预处理
    keyDownEventList.forEach(output => {
        const { id } = output;
        if (id === '[空格]') {
            output.key = ' ';
        } else {
            output.key = id;
        }
    });

    window.onkeydown = (e: KeyboardEvent) => {
        let evtKey: string = e.key;
        const target: EventTarget = e.target;
        if (evtKey !== 'Meta') {
            // 处理组合按键
            if ((e.ctrlKey || e.metaKey)) {
                if (e.shiftKey) {
                    evtKey = 'ctrl+shift+' + evtKey;
                } else {
                    evtKey = 'ctrl+' + evtKey;
                }
            }
        }
        const output = keyDownEventList.find(event => event.key === evtKey);
        if (output) {
            inputs[output.id]({
                keyName: output.id,
                target,
                isBody: target.tagName === 'BODY'
            });
        }
    }
}