module.exports = jest.fn(() => ({
  put: jest.fn(),
  signatureUrl: jest.fn(),
  delete: jest.fn(),
}));
