'use client';

import enMessages from '@/messages/en.json';
import { type ReactNode, createContext, useContext } from 'react';

const MessagesContext = createContext<Record<string, any>>(enMessages);

export function NextIntlClientProvider({
  messages,
  children,
}: { messages?: any; children: ReactNode }) {
  return (
    <MessagesContext.Provider value={messages || enMessages}>{children}</MessagesContext.Provider>
  );
}

export function useMessages() {
  return useContext(MessagesContext);
}
