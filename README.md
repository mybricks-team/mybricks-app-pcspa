# mybricks-app-pcspa
PC通用搭建应用
## dev
启动react应用及服务
```ts
yarn watch:test
cd pages
yarn dev:react
```
启动vue2应用及服务
```ts
yarn watch:test
cd pages
yarn dev:vue2
```
## build
打包react应用
```ts
cd pages
yarn build:react
//or 打包离线应用
yarn build:react-offline
```
打包vue2应用
```ts
cd pages
yarn build:vue2
//or 打包离线应用
yarn build:vue2-offline
```
## publish
<div style="color: orange;">
运行发布命令时会串行发布（zip或npm）两个应用包（目前是react和vue2）。具体参考publish脚本文件
</div>

发布离线应用
```ts
npm run publish:offline
```
发布在线应用
```ts
npm run publish:online
```