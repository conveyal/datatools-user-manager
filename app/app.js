import React from 'react'
import fetch from 'isomorphic-fetch'
import { Grid, Row, Col } from 'react-bootstrap'

import DatatoolsNavbar from 'datatools-navbar'
import { Auth0Manager, DataManager } from 'datatools-common'

import { ajax } from './util'
import UserList from './userlist'

import config from './config'

export default class App extends React.Component {

  constructor (props) {
    super(props)

    this.state = {
      user: null
    }

    this.auth0 = new Auth0Manager(config)
    this.dataManager = new DataManager({
      managerUrl : config.managerUrl
    })

    var login = this.auth0.checkExistingLogin()
    if (login) this.handleLogin(login)
  }

  handleLogin (loginPromise) {

    var projectsPromise = loginPromise.then((user) => {
      // retrieve all projects (feed collections) and populate feeds for the default project
      return this.dataManager.getProjectsAndFeeds(user)
    })

    Promise.all([loginPromise, projectsPromise]).then((results) => {
      let user = results[0]
      let projects = results[1]

      // prepend "All Sources" wildcard to beginning of each feed array
      for (var proj of projects) {
        proj.feeds.unshift({
          id: '*',
          name: 'All Sources'
        })
      }

      this.setState({
        user,
        projects
      })
    })
  }

  isAdmin () {
    var appAdmin = this.state.user && this.state.user.permissions.isApplicationAdmin()
    return appAdmin
  }

  render () {
    return (
      <div>
        <DatatoolsNavbar
          title={config.title}
          managerUrl={config.managerUrl}
          editorUrl={config.editorUrl}
          userAdminUrl='#'
          username={this.state.user ? this.state.user.profile.email : null}
          loginHandler={() => { this.handleLogin(this.auth0.loginViaLock()) }}
          logoutHandler={() => { this.auth0.logout() }}
          resetPasswordHandler={() => { this.auth0.resetPassword() }}
        />
        {this.isAdmin()
          ? <UserList
            token={this.state.user.token}
            projects={this.state.projects}
          />
          : (
            <Grid><Row><Col xs={12}>
              {this.state.user
                ? <p>You do not have sufficient user privileges to access this area</p>
                : <p>You must be logged in to access this area</p>
              }
            </Col></Row></Grid>
          )
        }

      </div>
    )
  }
}
