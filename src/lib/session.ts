export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
};

export const getGarageItems = (): string[] => {
  const garage = localStorage.getItem('garage_items');
  return garage ? JSON.parse(garage) : [];
};

export const setGarageItems = (items: string[]): void => {
  localStorage.setItem('garage_items', JSON.stringify(items));
};

export const addToGarage = (vehicleId: string): void => {
  const items = getGarageItems();
  if (!items.includes(vehicleId)) {
    items.push(vehicleId);
    setGarageItems(items);
  }
};

export const removeFromGarage = (vehicleId: string): void => {
  const items = getGarageItems();
  setGarageItems(items.filter(id => id !== vehicleId));
};

export const isInGarage = (vehicleId: string): boolean => {
  return getGarageItems().includes(vehicleId);
};
