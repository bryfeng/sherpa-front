import { render } from '@testing-library/react'

import { CardSkeleton } from '../components/panels/CardSkeleton'

describe('CardSkeleton', () => {
  it('renders density attribute for accessibility instrumentation', () => {
    const { container } = render(<CardSkeleton density="full" />)
    const skeleton = container.querySelector('[data-density="full"]')
    expect(skeleton).toBeTruthy()
  })
})
