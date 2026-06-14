import { tokenizeVocabularyText } from '../lib/vocabulary'

interface VocabularyPickerProps {
  text: string
  enabled: boolean
  onPick: (term: string) => void
}

export function VocabularyPicker({ text, enabled, onPick }: VocabularyPickerProps) {
  if (!enabled) {
    return <>{text}</>
  }

  return (
    <span className="vocabulary-text">
      {tokenizeVocabularyText(text).map((token, index) => {
        if (token.kind === 'text') {
          return <span key={`${index}-${token.value}`}>{token.value}</span>
        }

        return (
          <button
            className="vocabulary-token"
            key={`${index}-${token.value}`}
            onClick={(event) => {
              event.stopPropagation()
              onPick(token.value)
            }}
            type="button"
          >
            {token.value}
          </button>
        )
      })}
    </span>
  )
}
