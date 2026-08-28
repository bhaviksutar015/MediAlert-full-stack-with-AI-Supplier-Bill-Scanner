const getExpiryStatus = (expiryDate) => {
  const today = new Date();
  const expiry = new Date(expiryDate);

  // Remove time for accurate date comparison
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  // Already expired
  if (expiry < today) {
    return "expired";
  }

  // Calculate days remaining
  const difference = expiry.getTime() - today.getTime();
  const daysRemaining = Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );

  // Expiring within 30 days
  if (daysRemaining <= 30) {
    return "expiring-soon";
  }

  return "safe";
};

const getDaysUntilExpiry = (expiryDate) => {
  const today = new Date();
  const expiry = new Date(expiryDate);

  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const difference = expiry.getTime() - today.getTime();

  return Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );
};

const isLowStock = (quantity, minimumStock) => {
  return quantity <= minimumStock;
};

module.exports = {
  getExpiryStatus,
  getDaysUntilExpiry,
  isLowStock,
};
