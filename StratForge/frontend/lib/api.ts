import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export const getPositions = async () => {
  const res = await axios.get(`${API_BASE}/trade/my-positions`);
  return res.data;
};

export const getPortfolio = async () => {
  const res = await axios.get(`${API_BASE}/trade/portfolio`);
  return res.data;
};

export const getTradeHistory = async () => {
  const res = await axios.get(`${API_BASE}/trade/history`);
  return res.data;
};

export const getIndicators = async () => {
  const res = await axios.get(`${API_BASE}/indicators`);
  return res.data;
};
