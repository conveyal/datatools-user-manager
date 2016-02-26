export default class PermissionData {
  constructor (datatoolsJson) {
    this.appPermissionLookup = {}
    if (datatoolsJson && datatoolsJson.permissions) {
      for (var appPermission of datatoolsJson.permissions) {
        this.appPermissionLookup[appPermission.type] = appPermission
      }
    }

    this.projectLookup = {}
    if (datatoolsJson && datatoolsJson.projects) {
      for (var project of datatoolsJson.projects) {
        this.projectLookup[project.project_id] = project
      }
    }
  }

  isApplicationAdmin () {
    return ('administer-application' in this.appPermissionLookup)
  }

  hasProject (projectId) {
    return (projectId in this.projectLookup)
  }

  isProjectAdmin (projectId) {
    return this.hasProject(projectId) && this.getProjectPermission(projectId, 'administer-project') != null
  }

  getProjectPermissions (projectId) {
    if (!this.hasProject(projectId)) return null
    return this.projectLookup[projectId].permissions
  }

  getProjectDefaultFeeds (projectId) {
    if (!this.hasProject(projectId)) return null
    return this.projectLookup[projectId].defaultFeeds || []
  }

  getProjectPermission (projectId, permissionType) {
    if (!this.hasProject(projectId)) return null
    var projectPermissions = this.getProjectPermissions(projectId)
    for (var permission of projectPermissions) {
      if (permission.type === permissionType) return permission
    }
    return null
  }
}
