import React from 'react'
import $ from 'jquery'
import fetch from 'isomorphic-fetch'

import DatatoolsNavbar from 'datatools-navbar'

import UserList from './userlist'
import PermissionData from './permissiondata'

import config from './config'

import { Grid, Row, Col } from 'react-bootstrap'

import { ajax } from './util'

export default class App extends React.Component {

  constructor (props) {
    super(props)

    this.state = {
      profile: null
    }

    this.lock = new Auth0Lock(config.auth0ClientId, config.auth0Domain)

    try {
      // Get the user token if we've saved it in localStorage before
      var userToken = localStorage.getItem('userToken')

      if (userToken) {
        this.getProfile(userToken)
      } else {
        var hash = this.lock.parseHash(window.location.hash)
        if (hash && hash.id_token) {
          // the user came back from the login (either SSO or regular login),
          // save the token
          localStorage.setItem('userToken', hash.id_token)

          // redirect to "targetUrl" if any
          window.location.href = hash.state || ''
          return
        }

        // check if logged in elsewhere via SSO
        this.lock.$auth0.getSSOData((err, data) => {
          if (!err && data.sso) {
            // there is! redirect to Auth0 for SSO
            this.lock.$auth0.signin({
              callbackOnLocationHash: true
            })
          } else { // assume that we are not logged in
          }
        })
      }
    } catch (err) {
      console.log(err)
      console.log('error retrieving user data from localStorage, clearing and starting over')
      this.logOut()
    }
  }

  logIn () {
    var lockOptions = {
      connections: ['Username-Password-Authentication']
    }
    if (config.logo) lockOptions.icon = config.logo
    this.lock.show(lockOptions, (err, profile, token) => {
      if (err) {
        console.log('There was an error :/', err)
        return
      }

      // save token to localStorage
      localStorage.setItem('userToken', token)

      this.userLoggedIn(token, profile)
    })
  }

  logOut () {
    localStorage.removeItem('userToken')
    window.location.replace('https://' + config.auth0Domain + '/v2/logout?returnTo=' + window.location.href)
  }

  resetPassword() {
    this.lock.showReset((err) => {
      if (!err) this.lock.hide()
    })
  }

  getProfile (token) {
    // retreive the user profile from Auth0
    ajax({
      url: 'https://' + config.auth0Domain + '/tokeninfo',
      data: { id_token: token },
      method: 'post',
      success: (profile) => { this.userLoggedIn(token, profile) },
      error: (err) => { this.logOut() }
    })
  }

  userLoggedIn (token, profile) {
    this.permissionData = new PermissionData(profile.app_metadata.datatools)

    // retrieve all projects (feed collections) and populate feeds for the default project
    var getFeedColls = ajax({
      url: config.managerUrl + '/api/feedcollections',
      headers: { 'Authorization': 'Bearer ' + token }
    })
    var getFeedSources = ajax({
      url: config.managerUrl + '/api/feedsources',
      headers: { 'Authorization': 'Bearer ' + token }
    })

    Promise.all([getFeedColls, getFeedSources]).then((results) => {
      this.projects = results[0]
      var projectLookup = {}
      for (var project of this.projects) {
        projectLookup[project.id] = project
        // initialize feed array with the wildcard feed
        project.feeds = [{
          id: '*',
          name: 'All Sources'
        }]
      }

      // populate project-level feed arrays
      for (var feed of results[1]) {
        projectLookup[feed.feedCollection.id].feeds.push(feed)
      }

      this.setState({
        profile: profile,
        token: token
      })
    })
    .catch((err) => {
      console.error(err)
      console.error(err.stack)
    })

    // set up single logout
    setInterval(() => {
      // if the token is not in local storage, there is nothing to check (i.e. the user is already logged out)
      if (!localStorage.getItem('userToken')) return

      this.lock.$auth0.getSSOData((err, data) => {
        // if there is still a session, do nothing
        if (err || (data && data.sso)) return

        // if we get here, it means there is no session on Auth0,
        // then remove the token and redirect to #login
        localStorage.removeItem('userToken')
        window.location.href = '/'
      })
    }, 5000)
  }

  isAdmin () {
    var appAdmin = this.permissionData && this.permissionData.isApplicationAdmin()
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
          username={this.state.profile ? this.state.profile.email : null}
          loginHandler={this.logIn.bind(this)}
          logoutHandler={this.logOut.bind(this)}
          resetPasswordHandler={this.resetPassword.bind(this)}
        />
        {this.isAdmin()
          ? <UserList
            token={this.state.token}
            feeds={this.feeds}
            projects={this.projects}
          />
          : <Grid><Row><Col xs={12}>You must be logged in as an adminstrator to access this area</Col></Row></Grid>}

      </div>
    )
  }
}
