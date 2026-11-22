/**
 * Static Learning Hints for Skill-Gap Guidance
 * Provides contextual career/competency development advice for missing skills.
 */
export const getSkillLearnHint = (skill: string): string => {
  const s = skill.toLowerCase()
  if (s.includes('docker') || s.includes('kubernetes') || s.includes('k8s') || s.includes('container')) {
    return 'Containerization & cloud deployment standard for scalable production environments'
  }
  if (s.includes('aws') || s.includes('gcp') || s.includes('azure') || s.includes('cloud')) {
    return 'Cloud architecture, IAM security and serverless infrastructure operations'
  }
  if (s.includes('python') || s.includes('fastapi') || s.includes('django') || s.includes('flask')) {
    return 'Core language for asynchronous backend APIs, data pipelines and automation'
  }
  if (s.includes('react') || s.includes('typescript') || s.includes('next') || s.includes('vue')) {
    return 'Modern component hierarchy, type-safe state management and UI performance'
  }
  if (s.includes('sql') || s.includes('postgres') || s.includes('mysql') || s.includes('database')) {
    return 'Relational database schema modeling, query optimization and ACID transactions'
  }
  if (s.includes('kafka') || s.includes('redis') || s.includes('rabbitmq') || s.includes('celery')) {
    return 'Distributed event streaming, pub-sub caching and message queue processing'
  }
  if (s.includes('node') || s.includes('express') || s.includes('nest')) {
    return 'Event-driven server-side JavaScript runtime and microservices architecture'
  }
  if (s.includes('go') || s.includes('golang') || s.includes('rust')) {
    return 'High-throughput concurrency patterns and systems-level memory safety'
  }
  if (s.includes('graphql') || s.includes('grpc') || s.includes('rest')) {
    return 'Network protocol design, contract schema definition and efficient data fetching'
  }
  if (s.includes('ci/cd') || s.includes('jenkins') || s.includes('actions') || s.includes('devops')) {
    return 'Continuous integration, automated regression testing and artifact release pipelines'
  }
  return 'Key technical qualification identified for this role requisition'
}
