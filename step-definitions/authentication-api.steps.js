const { Given, When, Then, Before } = require('@cucumber/cucumber');
const axios = require('axios');
const assert = require('assert');

let ctx = {};

Before(function () {
    ctx = {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
        response: null,
        token: null
    };
});

// --- Background ---

Given('the authentication service is available', async function () {
    const res = await axios.get(ctx.baseURL + '/health', { validateStatus: () => true });
    assert.strictEqual(res.status, 200, 'Auth service should be reachable');
});

Given('the API is accessible', async function () {
    const res = await axios.get(ctx.baseURL + '/health', { validateStatus: () => true });
    assert.strictEqual(res.status, 200, 'API should be accessible');
});

Given('I set the base URL to the API gateway', function () {
    ctx.baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
});

// --- Login page ---

Given('I am on the login page', async function () {
    const res = await axios.get(ctx.baseURL + '/login', { validateStatus: () => true });
    assert.strictEqual(res.status, 200, 'Login page should load');
});

When('I enter username {string}', function (username) {
    ctx.username = username;
    assert.ok(username.length > 0, 'Username should not be empty');
});

When('I enter password {string}', function (password) {
    ctx.password = password;
    assert.ok(password.length > 0, 'Password should not be empty');
});

When('I click the login button', async function () {
    assert.ok(ctx.username, 'Username must be set before login');
    assert.ok(ctx.password, 'Password must be set before login');

    ctx.response = await axios.post(ctx.baseURL + '/api/auth/login', {
        username: ctx.username,
        password: ctx.password
    }, { validateStatus: () => true });
});

// --- Login success assertions ---

Then('I should be authenticated successfully', function () {
    assert.strictEqual(ctx.response.status, 200);
    assert.ok(ctx.response.data.token, 'Response should contain auth token');
    ctx.token = ctx.response.data.token;
});

Then('I should be redirected to the dashboard', function () {
    assert.ok(ctx.response.data.redirectUrl, 'Should have redirect URL');
    assert.ok(ctx.response.data.redirectUrl.includes('/dashboard'));
});

// --- Login failure assertions ---

Then('I should see an error message {string}', function (expected) {
    assert.strictEqual(ctx.response.status, 401);
    assert.ok(ctx.response.data.message);
    assert.ok(ctx.response.data.message.includes(expected),
        'Expected "' + expected + '", got "' + ctx.response.data.message + '"');
});

Then('I should remain on the login page', function () {
    assert.ok(!ctx.response.data.token, 'No token should be returned');
    assert.ok(!ctx.response.data.redirectUrl, 'Should not redirect on failure');
});

// --- Session timeout ---

Given('I am authenticated and logged in', async function () {
    const res = await axios.post(ctx.baseURL + '/api/auth/login', {
        username: 'testuser@example.com',
        password: 'SecurePassword123'
    }, { validateStatus: () => true });
    assert.strictEqual(res.status, 200);
    ctx.token = res.data.token;
});

Given('my session has expired', async function () {
    await axios.post(ctx.baseURL + '/api/auth/logout', {}, {
        headers: { Authorization: 'Bearer ' + ctx.token },
        validateStatus: () => true
    });
    ctx.token = null;
});

When('I attempt to access a protected resource', async function () {
    ctx.response = await axios.get(ctx.baseURL + '/api/dashboard', {
        headers: ctx.token ? { Authorization: 'Bearer ' + ctx.token } : {},
        validateStatus: () => true
    });
});

Then('I should be redirected to the login page', function () {
    assert.strictEqual(ctx.response.status, 401);
    assert.ok(ctx.response.data.redirectUrl);
    assert.ok(ctx.response.data.redirectUrl.includes('/login'));
});

Then('I should see a message {string}', function (expected) {
    assert.ok(ctx.response.data.message);
    assert.ok(ctx.response.data.message.includes(expected));
});

// --- API Auth (from APIAuthFeature) ---

Given('I have valid user credentials', function () {
    ctx.credentials = { email: 'user@example.com', password: 'SecurePass123' };
});

When('I send a login request with email {string} and password {string}', async function (email, password) {
    ctx.response = await axios.post(ctx.baseURL + '/api/auth/login', {
        email: email,
        password: password
    }, { validateStatus: () => true });
});

Then('the response status should be {int}', function (status) {
    assert.strictEqual(ctx.response.status, status);
});

Then('the response should contain an auth token', function () {
    assert.ok(ctx.response.data.token);
    ctx.token = ctx.response.data.token;
});

Then('the token should be valid JWT format', function () {
    assert.ok(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*$/.test(ctx.token));
});

Given('I have user credentials with email {string}', function (email) {
    ctx.email = email;
});

When('I send a login request with invalid password {string}', async function (password) {
    ctx.response = await axios.post(ctx.baseURL + '/api/auth/login', {
        email: ctx.email,
        password: password
    }, { validateStatus: () => true });
});

Then('the response should contain error message {string}', function (expected) {
    assert.ok(ctx.response.data.message);
    assert.ok(ctx.response.data.message.includes(expected));
});

Then('no auth token should be returned', function () {
    assert.ok(!ctx.response.data || !ctx.response.data.token);
});

Given('I have a valid auth token', async function () {
    const res = await axios.post(ctx.baseURL + '/api/auth/login', {
        email: 'user@example.com',
        password: 'SecurePass123'
    });
    ctx.token = res.data.token;
});

When('I send a refresh token request', async function () {
    ctx.response = await axios.post(ctx.baseURL + '/api/auth/refresh', {}, {
        headers: { Authorization: 'Bearer ' + ctx.token },
        validateStatus: () => true
    });
});

Then('a new auth token should be returned', function () {
    assert.ok(ctx.response.data.token);
    ctx.newToken = ctx.response.data.token;
});

Then('the new token should be different from the old one', function () {
    assert.notStrictEqual(ctx.newToken, ctx.token);
});

Given('I have an expired auth token', function () {
    ctx.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIzfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
});

When('I use the expired token to access a protected resource', async function () {
    ctx.response = await axios.get(ctx.baseURL + '/api/user/profile', {
        headers: { Authorization: 'Bearer ' + ctx.token },
        validateStatus: () => true
    });
});
