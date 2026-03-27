import axios from 'axios';
async function run() {
  try {
    const url = 'https://www.okx.com/api/v5/dex/market/trending-tokens?chainId=196';
    console.log('Testing:', url);
    const res = await axios.get(url);
    console.log('Success!', res.data);
  } catch (err) {
    console.log('Error:', err.response?.status, err.response?.data);
  }
}
run();
