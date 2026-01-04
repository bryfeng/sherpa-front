import React, { useState, useRef, useEffect } from 'react'
import { MoreVertical, Pencil, Archive, Trash2, MessageSquare, Check, X } from 'lucide-react'
import { formatRelativeTime } from '../../utils/dateGroups'

interface ConversationItemProps {
  id: string
  title: string | undefined
  updatedAt: number
  isActive: boolean
  onClick: () => void
  onRename: (title: string) => void
  onArchive: () => void
  onDelete: () => void
}

export function ConversationItem({
  id,
  title,
  updatedAt,
  isActive,
  onClick,
  onRename,
  onArchive,
  onDelete,
}: ConversationItemProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(title ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayTitle = title ?? 'New conversation'

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
        setConfirmDelete(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartRename = () => {
    setEditValue(title ?? '')
    setIsEditing(true)
    setMenuOpen(false)
  }

  const handleSaveRename = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== title) {
      onRename(trimmed)
    }
    setIsEditing(false)
  }

  const handleCancelRename = () => {
    setEditValue(title ?? '')
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename()
    } else if (e.key === 'Escape') {
      handleCancelRename()
    }
  }

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete()
      setMenuOpen(false)
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <div
      className={`group relative flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
        isActive
          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'hover:bg-[var(--surface-3)]'
      }`}
      onClick={isEditing ? undefined : onClick}
    >
      <MessageSquare
        className="h-4 w-4 shrink-0"
        style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
      />

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveRename}
              className="w-full bg-transparent text-sm outline-none border-b border-[var(--accent)]"
              style={{ color: 'var(--text)' }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSaveRename()
              }}
              className="p-0.5 rounded hover:bg-[var(--surface-3)]"
            >
              <Check className="h-3 w-3" style={{ color: 'var(--success)' }} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCancelRename()
              }}
              className="p-0.5 rounded hover:bg-[var(--surface-3)]"
            >
              <X className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        ) : (
          <>
            <p
              className="text-sm truncate"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text)' }}
            >
              {displayTitle}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatRelativeTime(updatedAt)}
            </p>
          </>
        )}
      </div>

      {/* Menu trigger */}
      {!isEditing && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
              setConfirmDelete(false)
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-3)] transition-opacity"
          >
            <MoreVertical className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border shadow-lg py-1"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--line)',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleStartRename()
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-2)] transition-colors"
                style={{ color: 'var(--text)' }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive()
                  setMenuOpen(false)
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-2)] transition-colors"
                style={{ color: 'var(--text)' }}
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </button>
              <div className="border-t my-1" style={{ borderColor: 'var(--line)' }} />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-2)] transition-colors"
                style={{ color: confirmDelete ? 'var(--error)' : 'var(--text)' }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirmDelete ? 'Confirm delete' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
