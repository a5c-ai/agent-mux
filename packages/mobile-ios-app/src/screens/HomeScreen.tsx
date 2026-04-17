import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AgentsScreen,
  Card,
  ConnectionBanner,
  RunScreen,
  SessionListScreen,
  SettingsScreen,
  Text,
  useConnection,
} from '@a5c-ai/agent-mux-ui';

import { useGatewaySelector } from '../hooks/useGatewaySelector.js';
import { HOME_TABS, type HomeTabId } from '../navigation/tabs.js';
import { HookInboxScreen } from './HookInboxScreen.js';

function RunRail(props: { selectedRunId: string | null; onSelect(runId: string): void }): JSX.Element {
  const runs = useGatewaySelector((state) =>
    Object.values(state.runs.byId).sort((left, right) => Number(right.startedAt ?? 0) - Number(left.startedAt ?? 0)),
  );

  return (
    <View style={styles.runRail}>
      {runs.map((run) => (
        <Pressable key={run.runId} onPress={() => props.onSelect(run.runId)}>
          <Card>
            <Text style={styles.runTitle}>{String(run.agent ?? 'agent')}</Text>
            <Text>{run.runId}</Text>
            <Text>{String(run.status ?? 'running')}</Text>
          </Card>
        </Pressable>
      ))}
      {props.selectedRunId ? <RunScreen runId={props.selectedRunId} /> : <Text>No live runs yet.</Text>}
    </View>
  );
}

export function HomeScreen(): JSX.Element {
  const connection = useConnection();
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<HomeTabId>('runs');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  let content: JSX.Element;
  switch (activeTab) {
    case 'sessions':
      content = <SessionListScreen onSelect={setSelectedRunId} />;
      break;
    case 'agents':
      content = <AgentsScreen selected={selectedAgent} onSelect={setSelectedAgent} />;
      break;
    case 'inbox':
      content = <HookInboxScreen onOpenRun={setSelectedRunId} />;
      break;
    case 'settings':
      content = <SettingsScreen />;
      break;
    case 'runs':
    default:
      content = <RunRail selectedRunId={selectedRunId} onSelect={setSelectedRunId} />;
      break;
  }

  return (
    <View style={styles.container}>
      <ConnectionBanner status={connection.status} error={connection.error} />
      <ScrollView contentContainerStyle={styles.content}>{content}</ScrollView>
      <View style={styles.tabs}>
        {HOME_TABS.map((tab) => (
          <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tab}>
            <Text style={activeTab === tab.id ? styles.tabActive : undefined}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
  },
  content: {
    gap: 12,
    padding: 16,
    paddingBottom: 96,
  },
  runRail: {
    gap: 12,
  },
  runTitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  tabs: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 20,
    paddingTop: 12,
  },
  tab: {
    paddingHorizontal: 8,
  },
  tabActive: {
    fontSize: 16,
    lineHeight: 22,
  },
});
