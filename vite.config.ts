import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = 'ZJU_Microbiology_tests'
const isGitHubPagesBuild = process.env.GITHUB_PAGES === 'true'

// https://vite.dev/config/
export default defineConfig({
  base: '/ZJU_Microbiology_tests/',
  plugins: [react()],
})
