import './style.css';
import { getActiveSession } from './lib/auth';
import { renderSignIn } from './ui/signIn';
import { renderApp } from './ui/app';

const container = document.querySelector<HTMLDivElement>('#app')!;

async function bootstrap(): Promise<void> {
  // Requirement 18.1-18.2: no data is fetched, and only the sign-in form is
  // rendered, unless a valid (non-idle-expired) session exists.
  const session = await getActiveSession();

  if (!session) {
    renderSignIn(container, () => {
      void bootstrap();
    });
    return;
  }

  renderApp(container, () => {
    void bootstrap();
  });
}

void bootstrap();
