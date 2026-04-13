#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { createClient, registerBuiltInAdapters } from '@a5c-ai/agent-mux';
import { App, builtinPlugins } from '../index.js';

const client = createClient();
registerBuiltInAdapters(client);
render(<App client={client} plugins={builtinPlugins} />);
