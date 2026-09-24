import { CATEGORIES, DEFAULT_ASSIGNMENTS, PERSONALITIES, type CategoryId, type PersonalityId } from '../../shared/domain'

export function PersonalityPicker({
  assignments,
  onChange,
}: {
  assignments: Record<CategoryId, PersonalityId>
  onChange: (next: Record<CategoryId, PersonalityId>) => void
}) {
  return (
    <div className="card">
      {CATEGORIES.map((category) => (
        <div className="category-row" key={category.id}>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.95rem' }}>
              {category.label}
            </div>
            <div className="hint">{category.hint}</div>
          </div>
          <select
            value={assignments[category.id]}
            onChange={(e) =>
              onChange({ ...assignments, [category.id]: e.target.value as PersonalityId })
            }
          >
            {Object.values(PERSONALITIES).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}

export const defaultAssignments = DEFAULT_ASSIGNMENTS
