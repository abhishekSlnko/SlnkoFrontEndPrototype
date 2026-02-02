import axios from 'axios';
// import { baseurl } from './Variable';

const Axios = axios.create({
  baseURL: "http://localhost:8080/v1",
  withCredentials: true,
});

export default Axios;
