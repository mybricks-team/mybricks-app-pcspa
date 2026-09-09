declare module '*.module.less' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.less';

declare module '@mybricks/ai-render' {
  export class DataSource {
    axios: any;
  }
  export const Routes: any
  export const Route: any
  export const useLocation: any
  export const useNavigate: any
  export const useParams: any
}

declare module 'dayjs'
