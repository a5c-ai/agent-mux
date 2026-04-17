import React from 'react';
import { View } from 'react-native';

import { Text } from '../components/primitives/Text.js';
import { useSession } from '../hooks/useSession.js';

export function SessionDetailScreen(props: { sessionId: string }): JSX.Element {
  const session = useSession(props.sessionId);
  return (
    <View>
      <Text>{JSON.stringify(session, null, 2)}</Text>
    </View>
  );
}
