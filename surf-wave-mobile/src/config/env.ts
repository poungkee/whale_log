// 환경별 API URL 설정
export const ENV = {
  API_URL: __DEV__
    ? 'http://localhost:3000/api/v1'
    : 'https://whale-log-api.up.railway.app/api/v1',
};
