import { render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

import { ChatSurface, type ChatSurfaceProps } from '../components/surfaces/ChatSurface'
import type { AgentMessage } from '../types/defi-ui'

function createMessage(id: string, text: string, role: AgentMessage['role']): AgentMessage {
  return { id, role, text }
}

function renderChatSurface(overrides: Partial<ChatSurfaceProps> = {}) {
  const containerRef = React.createRef<HTMLDivElement>()
  const inputRef = React.createRef<HTMLTextAreaElement>()
  const props: ChatSurfaceProps = {
    containerRef,
    inputRef,
    messages: [
      createMessage('m1', 'Hello world', 'assistant'),
      createMessage('m2', 'User question', 'user'),
    ],
    onAction: vi.fn(),
    isAssistantTyping: false,
    prefersReducedMotion: false,
    ariaAnnouncement: '',
    inputValue: 'Hi',
    onInputChange: vi.fn(),
    onSend: vi.fn(),
    ...overrides,
  }
  return render(<ChatSurface {...props} />)
}

describe('ChatSurface', () => {
  it('renders messages', () => {
    renderChatSurface()
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('User question')).toBeInTheDocument()
  })
})
