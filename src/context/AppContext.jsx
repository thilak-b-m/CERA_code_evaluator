import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

const defaultProfile = {
  firstName: 'Aisha',
  lastName: 'Rahman',
  email: 'aisha.rahman@northstar.edu',
  bio: 'Faculty member focused on algorithms, systems, and making code review a learning moment.',
};

const AppContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  notify: () => {},
  toast: '',
  profile: defaultProfile,
  setProfile: () => {},
});

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return (
      localStorage.getItem('cera-theme') ||
      'dark'
    );
  });

  const [toast, setToast] = useState('');

  const [profile, setProfile] = useState(() => {
    try {
      const savedProfile =
        localStorage.getItem('cera-profile');

      if (savedProfile) {
        const parsedProfile =
          JSON.parse(savedProfile);

        return {
          ...defaultProfile,
          ...parsedProfile,
        };
      }
    } catch (error) {
      console.error(
        'Error loading saved profile:',
        error
      );
    }

    return defaultProfile;
  });

  /* =========================
     THEME
  ========================= */

  useEffect(() => {
    document.documentElement.classList.toggle(
      'light',
      theme === 'light'
    );

    localStorage.setItem(
      'cera-theme',
      theme
    );
  }, [theme]);

  /* =========================
     TOAST
  ========================= */

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast('');
    }, 2800);

    return () => clearTimeout(timer);
  }, [toast]);

  /* =========================
     SAVE PROFILE
  ========================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        'cera-profile',
        JSON.stringify(profile)
      );
    } catch (error) {
      console.error(
        'Error saving profile:',
        error
      );
    }
  }, [profile]);

  /* =========================
     UPDATE PROFILE
  ========================= */

  const updateProfile = (
    updatedProfile
  ) => {
    const newProfile = {
      ...defaultProfile,
      ...profile,
      ...updatedProfile,
    };

    setProfile(newProfile);

    try {
      localStorage.setItem(
        'cera-profile',
        JSON.stringify(newProfile)
      );
    } catch (error) {
      console.error(
        'Error saving profile:',
        error
      );
    }
  };

  /* =========================
     NOTIFICATION
  ========================= */

  const notify = (message) => {
    setToast(message);
  };

  /* =========================
     PROVIDER
  ========================= */

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        notify,
        toast,
        profile,
        setProfile: updateProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () =>
  useContext(AppContext);