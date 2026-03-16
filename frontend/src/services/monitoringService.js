import api from './api';

const monitoringService = {
  getOpsHealth: async () => {
    return await api.get('/health/ops');
  }
};

export default monitoringService;
