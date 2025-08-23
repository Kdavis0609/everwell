# Profile Handles System

The EverWell application now supports unique, human-readable profile handles for all users. This system allows users to have a custom identifier that's easier to share and remember than their UUID.

## Features

- **Auto-generated handles**: New users automatically receive a unique handle based on their email
- **Custom handles**: Users can set their own custom handle through the profile settings
- **Real-time availability checking**: Live validation with debounced availability checks
- **Automatic uniqueness**: Handles are automatically suffixed if the desired handle is taken
- **Format validation**: Handles are normalized to lowercase with only letters, numbers, hyphens, and underscores

## Database Functions

### `is_handle_available(candidate text)`
Checks if a handle is available for use.

**Parameters:**
- `candidate` (text): The handle to check

**Returns:** boolean - true if available, false if taken

**Usage:**
```sql
SELECT is_handle_available('my-handle');
```

### `update_my_handle(new_handle text)`
Updates the current user's handle.

**Parameters:**
- `new_handle` (text): The new handle to set

**Returns:** table with `id` and `handle` columns

**Usage:**
```sql
SELECT * FROM update_my_handle('my-new-handle');
```

## Handle Format Rules

- **Length**: 3-30 characters
- **Characters**: Only lowercase letters (a-z), numbers (0-9), hyphens (-), and underscores (_)
- **Uniqueness**: Each handle must be globally unique
- **Auto-generation**: Based on email local-part or user ID with fallback

## API Endpoints

### Handle Availability Check
`GET /api/handles/availability?handle=<handle>`

Returns JSON response:
```json
{
  "ok": true,
  "available": true
}
```

## UI Integration

The handle system is integrated into the Profile Settings page with:

- **Input field**: Real-time validation and character normalization
- **Availability indicator**: Shows if handle is available, taken, or checking
- **Update button**: Saves the new handle with proper error handling
- **Display**: Shows current handle in Account Details section

## Security

- All functions use `SECURITY DEFINER` to ensure proper authorization
- Users can only update their own handle
- Availability checks are read-only and safe for public use
- RLS policies ensure users can only access their own profile data
