export const asyncPipe = <T extends (...args: any[]) => any>(...funcs: T[]) => {
    return (arg) => funcs.reduce((promise, func) => promise.then(func), Promise.resolve(arg));
};
