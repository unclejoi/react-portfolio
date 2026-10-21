import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from './config.js';

function withEnvironment<T>(values: Record<string, string | undefined>, run: () => T): T {
  const previous = Object.fromEntries(Object.keys(values).map((name) => [name, process.env[name]]));
  try {
    for (const [name, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    return run();
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test('development defaults bind to loopback on port 3001', () => {
  withEnvironment({ HOST: undefined, PORT: undefined, NODE_ENV: undefined }, () => {
    const config = loadConfig();
    assert.equal(config.HOST, '127.0.0.1');
    assert.equal(config.PORT, 3001);
  });
});

test('production startup binds to all interfaces and uses the platform port', () => {
  withEnvironment({ HOST: undefined, PORT: '10000', NODE_ENV: undefined }, () => {
    const config = loadConfig({ production: true });
    assert.equal(config.HOST, '0.0.0.0');
    assert.equal(config.PORT, 10000);
  });
});

test('NODE_ENV production also defaults to binding all interfaces', () => {
  withEnvironment({ HOST: undefined, NODE_ENV: 'production' }, () => {
    assert.equal(loadConfig().HOST, '0.0.0.0');
    assert.equal(loadConfig({ production: false }).HOST, '127.0.0.1');
  });
});

test('an explicitly configured host and custom port are preserved in production', () => {
  withEnvironment({ HOST: ' 127.0.0.1 ', PORT: '4321', NODE_ENV: 'production' }, () => {
    const config = loadConfig({ production: true });
    assert.equal(config.HOST, '127.0.0.1');
    assert.equal(config.PORT, 4321);
  });
  withEnvironment({ HOST: '0.0.0.0', PORT: '10000', NODE_ENV: 'development' }, () => {
    assert.equal(loadConfig().HOST, '0.0.0.0');
  });
});

test('Pinecone index names accept the default and trim a configured name', () => {
  withEnvironment({ PINECONE_INDEX: undefined }, () => {
    assert.equal(loadConfig().PINECONE_INDEX, 'portfolio');
  });
  withEnvironment({ PINECONE_INDEX: '  portfolio-resume-768  ' }, () => {
    assert.equal(loadConfig().PINECONE_INDEX, 'portfolio-resume-768');
  });
});

test('existing-index defaults use 3072 dimensions and allow the default namespace', () => {
  withEnvironment({ EMBEDDING_DIMENSIONS: undefined, PINECONE_NAMESPACE: undefined }, () => {
    assert.equal(loadConfig().EMBEDDING_DIMENSIONS, 3072);
    assert.equal(loadConfig().PINECONE_NAMESPACE, '__default__');
  });
  withEnvironment({ PINECONE_NAMESPACE: '' }, () => {
    assert.equal(loadConfig().PINECONE_NAMESPACE, '');
  });
});

test('a Pinecone host cannot be mistaken for an index name', () => {
  for (const value of [
    'https://private-index-h9xzi97.svc.aped-4627-b74a.pinecone.io',
    'private-index-h9xzi97.svc.aped-4627-b74a.pinecone.io',
  ]) {
    withEnvironment({ PINECONE_INDEX: value }, () => {
      assert.throws(loadConfig, (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /PINECONE_INDEX/);
        assert.match(error.message, /index name/i);
        assert.match(error.message, /host URL/i);
        assert.equal(error.message.includes(value), false);
        return true;
      });
    });
  }
});

test('invalid Pinecone names fail before requests are sent', () => {
  for (const value of ['', 'Portfolio Index', '-portfolio-resume', 'portfolio-resume-', 'a'.repeat(46)]) {
    withEnvironment({ PINECONE_INDEX: value }, () => {
      assert.throws(loadConfig, /PINECONE_INDEX/);
    });
  }
});

test('configuration errors show actionable index guidance without exposing environment values', () => {
  const secretValues = {
    GEMINI_API_KEY: 'private-gemini-key-for-config-test',
    PINECONE_API_KEY: 'private-pinecone-key-for-config-test',
    PINECONE_INDEX: 'https://private-host-for-config-test.pinecone.io',
    PORT: 'private-invalid-port-for-config-test',
  };
  withEnvironment(secretValues, () => {
    assert.throws(loadConfig, (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /PINECONE_INDEX/);
      assert.match(error.message, /index name/i);
      assert.match(error.message, /PORT/);
      for (const value of Object.values(secretValues)) assert.equal(error.message.includes(value), false);
      return true;
    });
  });
});
