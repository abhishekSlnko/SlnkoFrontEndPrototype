import axios from 'axios';
import { baseurl } from './Variable';

const Axios = axios.create({
  baseURL: "http://localhost:8080",
  withCredentials: true,
});

export default Axios;
