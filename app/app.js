import React from 'react'
import $ from 'jquery'

import DatatoolsNavbar from 'datatools-navbar'

import UserList from './userlist'
import PermissionData from './permissiondata'

import config from './config'

import { Grid, Row, Col } from 'react-bootstrap'

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
    $.post('https://' + config.auth0Domain + '/tokeninfo', { id_token: token })
      .done((profile) => {
        this.userLoggedIn(token, profile)
      })
  }

  userLoggedIn (token, profile) {
    this.permissionData = new PermissionData(profile.app_metadata.datatools)

    console.log('getting feed IDs')
    $.ajax({
      url: config.managerUrl + '/api/feedsources',
      data: {
        feedcollection: config.projectId
      },
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: (data) => {
        console.log('got feed sources', data)

        // initialize the feed listing, including a catch-all entry at the beginning
        this.feeds = data
        this.feeds.unshift({
          id: '*',
          name: 'All Sources'
        })

        this.setState({
          profile: profile,
          token: token
        })
      },
      error: (err) => {
        console.log('error getting feed sources', err)
      }
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
    return this.permissionData && this.permissionData.isProjectAdmin(config.projectId)
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
          />
          : <Grid><Row><Col xs={12}>You must be logged in as an adminstrator to access this area</Col></Row></Grid>}

      </div>
    )
  }
}
