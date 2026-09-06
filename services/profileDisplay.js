export function getProfileDisplay(profile, sessionUser) {
  const user = { ...sessionUser, ...profile?.user };
  return {
    name: user.full_name?.trim() || [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Your profile',
    email: user.email && user.email !== 'No email provided' ? user.email : null,
    phone: user.phone || null,
    avatar: user.profilePictureUrl || (/^https?:\/\//i.test(user.avatar_url || '') ? user.avatar_url : null),
    branch: user.branch || null,
  };
}
