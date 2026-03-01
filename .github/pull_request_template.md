## Summary

<!-- Brief description of the changes -->

## Related Story

<!-- Link to story file, e.g., Story 1.1 -->

## Changes

-

## Checklist

- [ ] Follows naming conventions (database, API, code)
- [ ] Uses API response envelope for all endpoints
- [ ] Tests co-located with source files (`*.spec.ts`)
- [ ] Uses Zod schemas from `packages/shared` for validation
- [ ] Emits domain events for state transitions
- [ ] Includes `correlationId` in all log statements
- [ ] Uses `DomainException` for business errors
- [ ] Uses skeleton loaders for loading states (not spinners)
- [ ] No PII logged at info level or above
- [ ] All tests pass (`pnpm test`)
- [ ] Lint passes (`pnpm lint`)
