import logo from './logo.svg';
import './App.css';
import { MemoryRouter as Router, Route, Routes, useFetcher } from 'react-router-dom';

import JobRunner from './Components/JobRunner/JobRunner';
import { useEffect, useState } from 'react';
import axios from 'axios';

const BASE_API_URL = "http://127.0.0.1:6993"; 
const MAX_NUM_THREAD = 6;

function zip(list1, list2) {
  return Array.from({ length: Math.min(list1.length, list2.length) }, (_, i) => [list1[i], list2[i]]);
}

function App() {
  const [isBackendLive, setIsBackendLive] = useState(false);

  useEffect(() => {
    axios.get(`${BASE_API_URL}/stream_data/ping`).then((res) => {
      console.log("ping res >>", res)
      if (res.data.message === 'end_point available') {
        setIsBackendLive(true);
      }
    }).catch((err) => {
      setIsBackendLive(false);
    })
  }, [])

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<JobRunner isBackendLive={isBackendLive} BASE_API_URL={BASE_API_URL}/>} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
export { BASE_API_URL, MAX_NUM_THREAD, zip };
