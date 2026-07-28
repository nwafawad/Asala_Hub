'use client';

import { useEffect } from 'react';
import React from 'react';

export const AxeAudit: React.FC = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      // @ts-ignore
      import('@axe-core/react').then(axe => {
        // @ts-ignore
        import('react-dom').then(ReactDOM => {
          axe.default(React, ReactDOM, 1000);
        }).catch(() => {});
      }).catch(() => {});
    }
  }, []);

  return null;
};
