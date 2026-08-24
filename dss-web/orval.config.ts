import { defineConfig } from 'orval';

/**
 * Sinh type + React Query hooks từ OpenAPI spec của dss-service.
 *
 * Nguồn spec: ưu tiên file đã commit trong repo (../ingestion/dss-openapi.json).
 * Nếu backend đang chạy, có thể đổi `target` thành
 * 'http://localhost:8000/openapi.json' để lấy spec mới nhất.
 *
 * Chạy: yarn generate:api
 */
export default defineConfig({
  dss: {
    input: {
      target: process.env.OPENAPI_URL ?? '../ingestion/dss-openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './lib/api/generated/dss.ts',
      schemas: './lib/api/generated/model',
      client: 'react-query',
      prettier: true,
      override: {
        mutator: {
          path: './lib/api/client.ts',
          name: 'apiClient',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
