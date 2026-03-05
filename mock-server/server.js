/**
 * Lightweight mock API server for running Cucumber tests without a real backend.
 * Simulates: health check, login page, auth login, logout, refresh, dashboard, profile.
 *
 * Valid credentials (username/password or email/password):
 *   testuser@example.com / SecurePassword123
 *   user@example.com     / SecurePass123
 */

const http = require('http');

const VALID_USERS = {
    'testuser@example.com': 'SecurePassword123',
    'user@example.com': 'SecurePass123'
};

// Simple JWT-like tokens (not real JWTs, but pass the format regex check)
const SECRET = 'mock-secret';
let tokenCounter = 0;

function makeToken(email) {
    tokenCounter++;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: email, iat: Date.now(), n: tokenCounter })).toString('base64url');
    const sig = Buffer.from(SECRET + tokenCounter).toString('base64url');
    return header + '.' + payload + '.' + sig;
}

function isExpiredToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        // If exp field exists and is in the past (unix seconds)
        if (payload.exp && payload.exp < Date.now() / 1000) return true;
        return false;
    } catch {
        return true;
    }
}

function isValidToken(token) {
    if (!token) return false;
    // Reject known-expired tokens
    if (isExpiredToken(token)) return false;
    // Accept tokens we generated (they contain our secret prefix in sig)
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    try {
        const sig = Buffer.from(parts[2], 'base64url').toString();
        return sig.startsWith(SECRET);
    } catch {
        return false;
    }
}

// Track active tokens (simulates sessions)
const activeSessions = new Set();

function parseBody(req) {
    return new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch { resolve({}); }
        });
    });
}

function getAuthToken(req) {
    const auth = req.headers['authorization'] || '';
    if (auth.startsWith('Bearer ')) return auth.slice(7);
    return null;
}

function send(res, statusCode, body) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
    const url = req.url;
    const method = req.method;

    // Health check
    if (url === '/health' && method === 'GET') {
        return send(res, 200, { status: 'ok' });
    }

    // Login page (simulated)
    if (url === '/login' && method === 'GET') {
        return send(res, 200, { page: 'login' });
    }

    // Auth login
    if (url === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const email = body.email || body.username;
        const password = body.password;

        if (!VALID_USERS[email]) {
            return send(res, 401, { message: 'User not found' });
        }

        if (VALID_USERS[email] !== password) {
            return send(res, 401, { message: 'Invalid credentials' });
        }

        const token = makeToken(email);
        activeSessions.add(token);
        return send(res, 200, {
            token: token,
            redirectUrl: '/dashboard',
            message: 'Login successful'
        });
    }

    // Auth logout
    if (url === '/api/auth/logout' && method === 'POST') {
        const token = getAuthToken(req);
        if (token) activeSessions.delete(token);
        return send(res, 200, { message: 'Logged out' });
    }

    // Token refresh — BUG: returns 500 intermittently to simulate flaky server
    if (url === '/api/auth/refresh' && method === 'POST') {
        const token = getAuthToken(req);
        if (!token || !activeSessions.has(token)) {
            return send(res, 401, { message: 'Invalid or expired token' });
        }

        // BUG: server returns wrong status code (500 instead of 200)
        activeSessions.delete(token);
        const newToken = makeToken('refreshed');
        activeSessions.add(newToken);
        return send(res, 500, { token: newToken, error: 'Internal server error' });
    }

    // Protected: Dashboard
    if (url === '/api/dashboard' && method === 'GET') {
        const token = getAuthToken(req);
        if (!token || !activeSessions.has(token)) {
            return send(res, 401, {
                message: 'Your session has expired',
                redirectUrl: '/login'
            });
        }
        return send(res, 200, { page: 'dashboard', data: [] });
    }

    // Protected: User profile
    if (url === '/api/user/profile' && method === 'GET') {
        const token = getAuthToken(req);

        if (isExpiredToken(token)) {
            return send(res, 401, { message: 'Token expired' });
        }

        if (!token || !activeSessions.has(token)) {
            return send(res, 401, { message: 'Unauthorized' });
        }

        return send(res, 200, { email: 'user@example.com', name: 'Test User' });
    }

    // 404 for everything else
    send(res, 404, { message: 'Not found' });
});

let instance = null;

function start(port) {
    return new Promise((resolve, reject) => {
        instance = server.listen(port, () => {
            console.log('[MOCK SERVER] Running on port ' + port);
            resolve(instance);
        });
        instance.on('error', reject);
    });
}

function stop() {
    return new Promise((resolve) => {
        if (instance) {
            activeSessions.clear();
            instance.close(() => {
                console.log('[MOCK SERVER] Stopped');
                resolve();
            });
        } else {
            resolve();
        }
    });
}

module.exports = { start, stop };
