const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const mockUsers = new Map();

function getMockRole(email) {
	return email.toLowerCase().includes('faculty') ? 'faculty' : 'student';
}

function getMockUser(email, role, name) {
	const parts = (name || '').trim().split(/\s+/).filter(Boolean);

	return {
		id: `${role.toUpperCase()}-${email}`,
		name: name || email.split('@')[0],
		firstName: parts[0] || email.split('@')[0],
		lastName: parts.slice(1).join(' '),
		email,
		role,
	};
}

async function request(path, options) {
	const response = await fetch(`${apiBaseUrl}${path}`, {
		headers: { 'Content-Type': 'application/json' },
		...options,
	});
	const body = await response.json().catch(() => ({}));

	if (!response.ok) {
		const error = new Error(body.message || 'Authentication request failed.');
		error.code = response.status;
		throw error;
	}

	return body;
}

export const authService = {
	async signIn({ email, password }) {
		if (apiBaseUrl) {
			return request('/api/auth/login', {
				method: 'POST',
				body: JSON.stringify({ email, password }),
			});
		}

		const normalizedEmail = email.toLowerCase();
		const account = mockUsers.get(normalizedEmail);
		const role = account?.role || getMockRole(normalizedEmail);

		return {
			token: `mock-token-${normalizedEmail}`,
			user: getMockUser(normalizedEmail, role, account?.name),
		};
	},

	async signUp({ name, email, password }) {
		if (apiBaseUrl) {
			return request('/api/auth/signup', {
				method: 'POST',
				body: JSON.stringify({ name, email, password, role: 'student' }),
			});
		}

		const normalizedEmail = email.toLowerCase();
		if (mockUsers.has(normalizedEmail)) {
			const error = new Error('Email already registered.');
			error.code = 'EMAIL_EXISTS';
			throw error;
		}

		mockUsers.set(normalizedEmail, { name, role: 'student' });
		return { user: getMockUser(normalizedEmail, 'student', name) };
	},

	signOut: async () => true,
};