import renderUI from './renderUI'

const Vue = window.Vue;
let vueApp;
const render = (props) => {
    const { container } = props;
    const root = (container || document).querySelector('#mybricks-page-root')
    /** publish template style */
    root.style.width = '100%';
    root.style.height = '100%';
    vueApp = new Vue({
        render: (h) => h(renderUI({ ...props, renderType: 'vue3' })),
    }).$mount(root)
}

if (!window.__POWERED_BY_QIANKUN__) {
    render({});
}

export async function bootstrap() {
    console.log('react app bootstrap');
}

export async function mount(props) {
    render(props);
}

export async function unmount(props) {
    vueApp.$destroy();
    vueApp.$el.innerHTML = '';
}