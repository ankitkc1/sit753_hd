const requireAdmin = require('../middleware/requireAdmin');

function createRedirectResponse() {
  return {
    redirectedTo: null,
    redirect(path) {
      this.redirectedTo = path;
      return this;
    }
  };
}

describe('requireAdmin middleware unit gate', () => {
  test('passes authenticated admin sessions through to the next handler', () => {
    let nextCalled = false;
    const req = { session: { adminUserId: 'admin-user-id' } };
    const res = createRedirectResponse();

    requireAdmin(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(res.redirectedTo).toBeNull();
  });

  test('redirects anonymous users to the admin login page', () => {
    let nextCalled = false;
    const req = { session: {} };
    const res = createRedirectResponse();

    requireAdmin(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.redirectedTo).toBe('/onlyankit/login');
  });
});
