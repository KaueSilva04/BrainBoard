/**
 * Challenger M2-4-2: Live HTTP MCP Transport & Session Isolation Verification
 *
 * Directly tests live HTTP endpoints:
 * 1. GET /mcp/sse unauthenticated -> 401
 * 2. GET /mcp/sse with forged/invalid token -> 401
 * 3. POST /mcp unauthenticated -> 401
 * 4. GET /mcp unauthenticated -> 401
 * 5. POST /mcp/sse unauthenticated -> 401
 * 6. User B calling /mcp with User A's sessionId via mcp-session-id header -> 403
 * 7. User B calling /mcp?sessionId=... with User A's sessionId via query param -> 403
 * 8. User B calling GET /mcp with User A's sessionId via header -> 403
 * 9. User A calling /mcp with User A's sessionId -> Not 403 (Authorized)
 * 10. User A connecting to GET /mcp/sse with valid JWT -> 200 SSE stream
 */

import http from 'http';
import { prisma } from '../backend/src/prisma.js';
import { streamableSessions } from '../backend/src/modules/mcp/mcp.server.js';

const TEST_PORT = process.env.TEST_PORT || '3096';
process.env.PORT = TEST_PORT;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

interface HttpResponse {
  status: number;
  data: any;
  headers: http.IncomingHttpHeaders;
}

function makeRequest(
  method: string,
  path: string,
  body?: any,
  headersInit?: Record<string, string>
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;
    const headers: Record<string, string> = {
      ...headersInit,
    };
    if (postData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (postData) {
      headers['Content-Length'] = String(Buffer.byteLength(postData));
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
          // For SSE, abort after receiving initial event
          if (headersInit?.Accept === 'text/event-stream' || res.headers['content-type']?.includes('text/event-stream')) {
            req.destroy();
          }
        });
        res.on('end', () => {
          let data: any = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode || 0, data, headers: res.headers });
        });
        res.on('error', (err) => {
          // If aborted on purpose for SSE
          if (res.headers['content-type']?.includes('text/event-stream')) {
            resolve({ status: res.statusCode || 0, data: raw, headers: res.headers });
          } else {
            reject(err);
          }
        });
      }
    );
    req.on('error', (err) => {
      // Ignore abort errors for SSE
      if ((err as any).code === 'ECONNRESET') {
        return;
      }
      reject(err);
    });
    if (postData) req.write(postData);
    req.end();
  });
}

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, msg: string) {
  totalAssertions++;
  if (!condition) {
    failedAssertions++;
    console.error(`  ❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  }
  passedAssertions++;
  console.log(`  ✅ PASS: ${msg}`);
}

async function runLiveTransportSuite() {
  console.log('================================================================');
  console.log('   CHALLENGER M2-4-2: LIVE MCP TRANSPORT & SESSION ISOLATION    ');
  console.log('================================================================\n');

  console.log('[Setup] Starting live backend Express server on port', TEST_PORT);
  const appModule = await import('../backend/src/index.js');

  // Wait 1.5 seconds for server startup
  await new Promise((r) => setTimeout(r, 1500));

  const health = await makeRequest('GET', '/api/health');
  assert(health.status === 200, `Server health check on port ${TEST_PORT}`);

  const suffix = Date.now().toString().slice(-6);
  const aliceEmail = `alice_live_mcp_${suffix}@challenger.test`;
  const bobEmail = `bob_live_mcp_${suffix}@challenger.test`;

  let tokenA = '';
  let tokenB = '';
  let aliceId = '';
  let bobId = '';

  try {
    // 1. Register Alice
    const regA = await makeRequest('POST', '/api/auth/register', {
      name: 'Alice Live',
      email: aliceEmail,
      password: 'AlicePassword123!',
    });
    assert(regA.status === 201, 'Alice registration returns HTTP 201');
    tokenA = regA.data.token;
    aliceId = regA.data.user.id;
    assert(Boolean(tokenA && aliceId), 'Alice token and ID acquired');

    // 2. Register Bob
    const regB = await makeRequest('POST', '/api/auth/register', {
      name: 'Bob Live',
      email: bobEmail,
      password: 'BobPassword123!',
    });
    assert(regB.status === 201, 'Bob registration returns HTTP 201');
    tokenB = regB.data.token;
    bobId = regB.data.user.id;
    assert(Boolean(tokenB && bobId), 'Bob token and ID acquired');

    // ------------------------------------------------------------------------
    // SECTION 1: Unauthenticated Requests to MCP Transports
    // ------------------------------------------------------------------------
    console.log('\n--- Section 1: Unauthenticated Requests to MCP Transports ---');

    // 1.1 GET /mcp/sse without token
    const unauthSse = await makeRequest('GET', '/mcp/sse');
    assert(
      unauthSse.status === 401,
      `GET /mcp/sse unauthenticated must return 401 (got ${unauthSse.status})`
    );
    assert(
      String(unauthSse.data?.error || '').includes('Autenticação necessária'),
      `GET /mcp/sse returns auth error message (got: ${JSON.stringify(unauthSse.data)})`
    );

    // 1.2 GET /mcp/sse with forged token
    const forgedSse = await makeRequest('GET', '/mcp/sse', undefined, {
      Authorization: 'Bearer invalid.forged.token',
    });
    assert(
      forgedSse.status === 401,
      `GET /mcp/sse with forged token must return 401 (got ${forgedSse.status})`
    );

    // 1.3 POST /mcp unauthenticated
    const unauthMcpPost = await makeRequest('POST', '/mcp', { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    assert(
      unauthMcpPost.status === 401,
      `POST /mcp unauthenticated must return 401 (got ${unauthMcpPost.status})`
    );
    assert(
      String(unauthMcpPost.data?.error || '').includes('Autenticação necessária'),
      `POST /mcp returns auth error message (got: ${JSON.stringify(unauthMcpPost.data)})`
    );

    // 1.4 GET /mcp unauthenticated
    const unauthMcpGet = await makeRequest('GET', '/mcp');
    assert(
      unauthMcpGet.status === 401,
      `GET /mcp unauthenticated must return 401 (got ${unauthMcpGet.status})`
    );

    // 1.5 POST /mcp/sse unauthenticated
    const unauthMcpSsePost = await makeRequest('POST', '/mcp/sse');
    assert(
      unauthMcpSsePost.status === 401,
      `POST /mcp/sse unauthenticated must return 401 (got ${unauthMcpSsePost.status})`
    );

    // ------------------------------------------------------------------------
    // SECTION 2: Streamable HTTP Session Hijacking Defense
    // ------------------------------------------------------------------------
    console.log('\n--- Section 2: Streamable HTTP Session Hijacking Defense ---');

    // Create a mock active session belonging to Alice in streamableSessions
    console.log('Is appModule.streamableSessions === streamableSessions?', (appModule as any).streamableSessions === streamableSessions);
    const targetMap = (appModule as any).streamableSessions || streamableSessions;
    const aliceSessionId = `alice-active-session-${suffix}`;
    let mockServerCallCount = 0;
    targetMap.set(aliceSessionId, {
      transport: {
        handleRequest: async (req: any, res: any) => {
          mockServerCallCount++;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result: 'Alice Private Data' }));
        },
      } as any,
      server: {} as any,
      userId: aliceId,
    });

    try {
      // 2.1 Bob attempts to call /mcp with Alice's sessionId in mcp-session-id header
      const hijackHeaderRes = await makeRequest(
        'POST',
        '/mcp',
        { jsonrpc: '2.0', id: 1, method: 'tools/list' },
        {
          Authorization: `Bearer ${tokenB}`,
          'mcp-session-id': aliceSessionId,
        }
      );
      console.log('Bob hijack response:', hijackHeaderRes.status, hijackHeaderRes.data);
      assert(
        hijackHeaderRes.status === 403,
        `Bob calling /mcp with Alice sessionId in header must return HTTP 403 Forbidden (got ${hijackHeaderRes.status})`
      );
      assert(
        String(hijackHeaderRes.data?.error || '').includes('pertence a outro usuário'),
        `HTTP 403 response body must mention session belongs to another user (got: ${JSON.stringify(hijackHeaderRes.data)})`
      );
      assert(mockServerCallCount === 0, 'Alice session transport handleRequest was NOT invoked during hijack attempt');

      // 2.2 Bob attempts to call /mcp with Alice's sessionId in URL query parameter (?sessionId=...)
      const hijackQueryRes = await makeRequest(
        'POST',
        `/mcp?sessionId=${aliceSessionId}`,
        { jsonrpc: '2.0', id: 1, method: 'tools/list' },
        {
          Authorization: `Bearer ${tokenB}`,
        }
      );
      assert(
        hijackQueryRes.status === 403,
        `Bob calling /mcp?sessionId=... with Alice sessionId must return HTTP 403 Forbidden (got ${hijackQueryRes.status})`
      );
      assert(
        String(hijackQueryRes.data?.error || '').includes('pertence a outro usuário'),
        `HTTP 403 response body must mention session belongs to another user (got: ${JSON.stringify(hijackQueryRes.data)})`
      );
      assert(mockServerCallCount === 0, 'Alice session transport was NOT invoked during query hijack attempt');

      // 2.3 Bob attempts GET /mcp with Alice's sessionId in header
      const hijackGetRes = await makeRequest('GET', '/mcp', undefined, {
        Authorization: `Bearer ${tokenB}`,
        'mcp-session-id': aliceSessionId,
      });
      assert(
        hijackGetRes.status === 403,
        `Bob calling GET /mcp with Alice sessionId must return HTTP 403 Forbidden (got ${hijackGetRes.status})`
      );

      // 2.4 Alice calls /mcp with Alice's own sessionId in header -> Must NOT return 403
      const aliceOwnSessionRes = await makeRequest(
        'POST',
        '/mcp',
        { jsonrpc: '2.0', id: 2, method: 'tools/list' },
        {
          Authorization: `Bearer ${tokenA}`,
          'mcp-session-id': aliceSessionId,
        }
      );
      assert(
        aliceOwnSessionRes.status === 200,
        `Alice calling /mcp with her own sessionId succeeds with HTTP 200 (got ${aliceOwnSessionRes.status})`
      );
      assert(
        mockServerCallCount === 1,
        'Alice session transport handleRequest was successfully invoked for Alice'
      );
    } finally {
      targetMap.delete(aliceSessionId);
    }

    // ------------------------------------------------------------------------
    // SECTION 3: Authenticated SSE Transport Connectivity
    // ------------------------------------------------------------------------
    console.log('\n--- Section 3: Authenticated SSE Transport Connectivity ---');

    // Alice connects to GET /mcp/sse with valid JWT
    const authSseRes = await makeRequest('GET', '/mcp/sse', undefined, {
      Authorization: `Bearer ${tokenA}`,
      Accept: 'text/event-stream',
    });
    assert(
      authSseRes.status === 200,
      `Alice GET /mcp/sse with valid token returns HTTP 200 (got ${authSseRes.status})`
    );
    assert(
      String(authSseRes.headers['content-type']).includes('text/event-stream'),
      `Alice GET /mcp/sse response is text/event-stream (got ${authSseRes.headers['content-type']})`
    );

    console.log('\n================================================================');
    console.log('   CHALLENGER M2-4-2: ALL LIVE TRANSPORT TESTS PASSED!          ');
    console.log(`   Total Assertions: ${totalAssertions} | Passed: ${passedAssertions} | Failed: ${failedAssertions}`);
    console.log('================================================================\n');
  } finally {
    // Cleanup
    try {
      await prisma.user.deleteMany({
        where: { id: { in: [aliceId, bobId].filter(Boolean) } },
      });
    } catch {}
  }
}

runLiveTransportSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
