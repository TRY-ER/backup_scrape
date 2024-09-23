(function () {
  // Save the original WebSocket constructor
  const OriginalWebSocket = window.WebSocket;

  // Override the WebSocket constructor
  window.WebSocket = function (url, protocols) {
    // Disable WebSocket connection to hot-reload server
    if (url.includes('localhost:3000/sockjs-node')) {
      console.info('[DEV NOTICE] Live Reload Has Been Disabled');
      return {}; // Return an empty object to stop connection
    }
    // For other WebSocket URLs, use the original constructor
    return new OriginalWebSocket(url, protocols);
  };
})();