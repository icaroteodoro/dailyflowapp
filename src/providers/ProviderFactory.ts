import { ITaskProvider } from './TaskProvider';
import { ClickUpProvider } from './clickup/ClickUpProvider';
import { ProviderType } from '../types';

const providers: Record<ProviderType, ITaskProvider> = {
  clickup: new ClickUpProvider(),
  linear: new ClickUpProvider(), // Placeholder for future expansion
  jira: new ClickUpProvider(),   // Placeholder for future expansion
};

export const ProviderFactory = {
  getProvider(type: ProviderType = 'clickup'): ITaskProvider {
    return providers[type] || providers.clickup;
  },
};
