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
	const response = await fetch(`${apiBaseUrl || ''}${path}`, {
		headers: { 'Content-Type': 'application/json' },
		...options,
	});
	const contentType = response.headers.get('content-type') || '';
	if (!contentType.includes('application/json')) {
		const error = new Error('Unexpected response from authentication service.');
		error.code = response.status;
		throw error;
	}

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

	async forgotPassword(email) {
		return request('/api/auth/forgot-password', {
			method: 'POST',
			body: JSON.stringify({ email }),
		});
	},

	async resetPassword(token, password) {
		return request('/api/auth/reset-password', {
			method: 'POST',
			body: JSON.stringify({ token, password }),
		});
	},

	signOut: async () => true,
};