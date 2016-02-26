import React from 'react'
import { Row, Col, Input, Panel, SplitButton, MenuItem, Label, ButtonGroup, Button } from 'react-bootstrap'

import allPermissions from './permissions'

import $ from 'jquery'

import config from './config'

import update from 'react-addons-update'

export default class UserSettings extends React.Component {

  constructor (props) {
    super(props)

    let projectSettings = {}
    props.projects.forEach((project, i) => {
      let access = 'none'
      let defaultFeeds = []
      let permissions = []

      if(props.userPermissions.hasProject(project.id)) {
        if(props.userPermissions.isProjectAdmin(project.id)) access = 'admin'
        else {
          access = 'custom'
          let projectPermissions = props.userPermissions.getProjectPermissions(project.id)
          permissions = projectPermissions.map((p) => { return p.type })
          defaultFeeds = props.userPermissions.getProjectDefaultFeeds(project.id)
        }
      }
      projectSettings[project.id] = { access, defaultFeeds, permissions }
    })

    this.state = {
      appAdminChecked: props.userPermissions.isApplicationAdmin(),
      currentProjectIndex: 0,
      projectSettings: projectSettings
    }
  }

  getSettings () {
    if(this.state.appAdminChecked) {
      return {
        permissions: [{
          type: 'administer-application'
        }]
      }
    }

    let settings = { projects: [] }

    this.props.projects.forEach((project, i) => {
      let stateProjectSettings = this.state.projectSettings[project.id]
      if (stateProjectSettings.access === 'none') return

      let projectSettings = {
        project_id: project.id,
        permissions: []
      }
      if (stateProjectSettings.access === 'admin') {
        projectSettings.permissions.push({
          type: 'administer-project'
        })
      } else if (stateProjectSettings.access === 'custom') {
        projectSettings.defaultFeeds = stateProjectSettings.defaultFeeds
        // users have view-all permissions by default
        projectSettings.permissions.push({
          type: 'view-feed',
          feeds: ['*']
        })
        projectSettings.permissions = projectSettings.permissions.concat(stateProjectSettings.permissions.map((permission) => {
          return { type: permission }
        }))
      }
      settings.projects.push(projectSettings)
    })

    return settings
  }

  projectSelected (evt, key) {
    let currentProject = this.props.projects[key]

    this.setState({
      currentProjectIndex: key
    })
  }

  appAdminClicked () {
    this.setState({
      appAdminChecked: this.refs['appAdminCheckbox'].getChecked()
    })
  }

  projectAccessUpdated(projectId, newAccess) {
    var stateUpdate = { projectSettings: { [projectId]: { $merge : { access : newAccess } } } };
    this.setState(update(this.state, stateUpdate));
  }

  projectFeedsUpdated(projectId, newFeeds) {
    var stateUpdate = { projectSettings: { [projectId]: { $merge : { defaultFeeds : newFeeds } } } };
    this.setState(update(this.state, stateUpdate));
  }

  projectPermissionsUpdated(projectId, newPermissions) {
    var stateUpdate = { projectSettings: { [projectId]: { $merge : { permissions : newPermissions } } } };
    this.setState(update(this.state, stateUpdate));
  }

  render () {
    let currentProject = this.props.projects[this.state.currentProjectIndex]

    let projectPanel = (<Panel header={
      <h3>
        Project Settings for&nbsp;
        <SplitButton
          title={currentProject.name}
          onSelect={this.projectSelected.bind(this)}
          pullRight
        >
          {this.props.projects.map((project, i) => {
            let settings = this.state.projectSettings[project.id]
            return <MenuItem eventKey={i}>{project.name} {getProjectLabel(settings.access)}</MenuItem>
          })}
        </SplitButton>
      </h3>
    }>
      {this.props.projects.map((project, i) => {
        let settings = this.state.projectSettings[project.id]
        return <ProjectSettings
          project={project}
          settings={settings}
          visible={(i === this.state.currentProjectIndex)}
          projectAccessUpdated={this.projectAccessUpdated.bind(this)}
          projectFeedsUpdated={this.projectFeedsUpdated.bind(this)}
          projectPermissionsUpdated={this.projectPermissionsUpdated.bind(this)}
        />
      })}
    </Panel>)

    return (
      <Row>
        <Col xs={4}>
          <Panel header={<h3>Application Settings</h3>}>
            <Input
              type='checkbox'
              label='Application Administrator'
              defaultChecked={this.state.appAdminChecked}
              onClick={this.appAdminClicked.bind(this)}
              ref='appAdminCheckbox'
            />
          </Panel>
        </Col>
        <Col xs={8}>
          {this.state.appAdminChecked
            ? <i>Application administrators have full access to all projects.</i>
            : projectPanel
          }
        </Col>
      </Row>
    )
  }
}

function getProjectLabel(access) {
  switch(access) {
    case 'none': return <Label>None</Label>
    case 'admin': return <Label bsStyle="primary">Admin</Label>
    case 'custom': return <Label bsStyle="success">Custom</Label>
  }
}

class ProjectSettings extends React.Component {

  static propTypes = {
    project: React.PropTypes.object.isRequired,
    settings: React.PropTypes.object.isRequired
  }

  setAccess (access) {
    this.props.projectAccessUpdated(this.props.project.id, access)
  }

  feedsUpdated () {
    let selectedFeeds = []
    this.props.project.feeds.forEach((feed) => {
      var checkbox = this.refs['feed-' + feed.id]
      if(checkbox.getChecked()) selectedFeeds.push(feed.id)
    })
    this.props.projectFeedsUpdated(this.props.project.id, selectedFeeds)
  }

  permissionsUpdated () {
    let selectedPermissions = []
    allPermissions.forEach((permission) => {
      var checkbox = this.refs['permission-' + permission.type]
      if(checkbox.getChecked()) selectedPermissions.push(permission.type)
    })
    this.props.projectPermissionsUpdated(this.props.project.id, selectedPermissions)
  }

  render () {
    let lookup = {}
    return (
      <Row style={{display: this.props.visible ? 'block' : 'none'}}>
        <Col xs={12}>
          <Row>
            <Col xs={12}>
              <ButtonGroup pullRight>
                <Button
                  active={this.props.settings.access === 'none'}
                  onClick={this.setAccess.bind(this, 'none')}
                >No Access</Button>

                <Button
                  active={this.props.settings.access === 'admin'}
                  onClick={this.setAccess.bind(this, 'admin')}
                >Admin</Button>

                <Button
                  active={this.props.settings.access === 'custom'}
                  onClick={this.setAccess.bind(this, 'custom')}
                >Custom</Button>
              </ButtonGroup>
            </Col>
          </Row>
          {this.props.settings.access === 'custom' ? (
            <Row>
              <Col xs={6}>
                <h4>Feed Sources</h4>
                {this.props.project.feeds.map((feed, i) => {
                  let name = (feed.name === '') ? '(unnamed feed)' : feed.name
                  let ref = 'feed-' + feed.id
                  let checked = this.props.settings.defaultFeeds.indexOf(feed.id) !== -1
                  return <Input
                    ref={ref}
                    type='checkbox'
                    defaultChecked={checked}
                    label={name}
                    onClick={this.feedsUpdated.bind(this)}
                  />
                })}
              </Col>
              <Col xs={6}>
                <h4>Permissions</h4>
                {allPermissions.map((permission, i) => {
                  let ref = 'permission-' + permission.type
                  let checked = this.props.settings.permissions.indexOf(permission.type) !== -1
                  return <Input
                    ref={ref}
                    type='checkbox'
                    defaultChecked={checked}
                    label={permission.name}
                    onClick={this.permissionsUpdated.bind(this)}
                  />
                })}
              </Col>
            </Row>
          ) : ''}
        </Col>
      </Row>
    )
  }
}
