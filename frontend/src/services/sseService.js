// SSE (Server-Sent Events) service for real-time data
class SSEService {
  constructor() {
    this.eventSources = {};
    this.listeners = {
      status: [],
      workerStatus: [],
      monitorEvents: []
    };
  }

  // Connect to an SSE endpoint
  connect(endpoint, type) {
    if (this.eventSources[type]) {
      this.disconnect(type);
    }

    const eventSource = new EventSource(`http://localhost:8000${endpoint}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.notifyListeners(type, data);
      } catch (error) {
        console.error(`Error parsing SSE data for ${type}:`, error);
      }
    };

    eventSource.onerror = (error) => {
      console.error(`SSE connection error for ${type}:`, error);
      this.disconnect(type);
      // Try to reconnect after a delay
      setTimeout(() => this.connect(endpoint, type), 5000);
    };

    this.eventSources[type] = eventSource;
    return eventSource;
  }

  // Disconnect from an SSE endpoint
  disconnect(type) {
    if (this.eventSources[type]) {
      this.eventSources[type].close();
      delete this.eventSources[type];
    }
  }

  // Disconnect from all SSE endpoints
  disconnectAll() {
    Object.keys(this.eventSources).forEach(type => {
      this.disconnect(type);
    });
  }

  // Add a listener for a specific type of SSE data
  addListener(type, callback) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);

    // Connect to the appropriate endpoint if not already connected
    if (!this.eventSources[type]) {
      switch (type) {
        case 'status':
          this.connect('/status', type);
          break;
        case 'workerStatus':
          this.connect('/monitor/worker', type);
          break;
        case 'monitorEvents':
          this.connect('/monitor/events', type);
          break;
        default:
          console.warn(`Unknown SSE type: ${type}`);
      }
    }

    // Return a function to remove this listener
    return () => {
      this.removeListener(type, callback);
    };
  }

  // Remove a listener
  removeListener(type, callback) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
      
      // If no more listeners for this type, disconnect
      if (this.listeners[type].length === 0) {
        this.disconnect(type);
      }
    }
  }

  // Notify all listeners of a specific type
  notifyListeners(type, data) {
    if (this.listeners[type]) {
      this.listeners[type].forEach(callback => {
        callback(data);
      });
    }
  }
}

// Create a singleton instance
const sseService = new SSEService();

export default sseService;
