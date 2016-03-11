import React from 'react'
import $ from 'jquery'

import { Panel, Grid, Row, Col, Button } from 'react-bootstrap'

import CreateUser from './createuser'
import UserSettings from './usersettings'
import { UserPermissions } from 'datatools-common'

import config from './config'

export default class UserList extends React.Component {

  constructor (props) {
    super(props)

    this.state = {
      users: []
    }
  }

  componentDidMount () {
    this.fetchUsers()
  }

  fetchUsers () {
    $.ajax({
      url: '/secured/getUsers',
      headers: {
        'Authorization': 'Bearer ' + this.props.token
      }
    }).done((data) => {
      var users = JSON.parse(data).map((user) => {
        user.userPermissions = new UserPermissions(user.app_metadata ? user.app_metadata.datatools : null)
        return user
      })

      this.setState({
        users: users
      })
    })
  }

  updateUser (user, permissions) {
    var payload = {
      user_id: user.user_id,
      data: permissions
    }

    $.ajax({
      url: '/secured/updateUser',
      data: payload,
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + this.props.token
      }
    }).done((data) => {
      console.log('update user ok', data)
      this.fetchUsers()
    })
  }

  createUser (email, password, permissions) {
    var payload = {
      email: email,
      password: password,
      permissions: permissions
    }

    $.ajax({
      url: '/secured/createUser',
      data: payload,
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + this.props.token
      }
    }).done((data) => {
      this.fetchUsers()
    })
  }

  render () {
    return (

      <Grid>
        <Row>
          <Col xs={12}>
            <h2>User Management</h2>
          </Col>
        </Row>

        <Row>
          <Col xs={8}>
            <h3>All Users</h3>
          </Col>
          <Col xs={4}>
            <CreateUser
              projects={this.props.projects}
              createUser={this.createUser.bind(this)}
            />
          </Col>
        </Row>

        {this.state.users.map((user, i) => {
          return <UserRow
            projects={this.props.projects}
            user={user}
            key={i}
            updateUser={this.updateUser.bind(this)}
            token={this.props.token}
          />
        })}

      </Grid>
    )
  }
}

class UserRow extends React.Component {

  constructor (props) {
    super(props)
    this.state = {
      isEditing: false
    }
  }

  toggleExpansion () {
    if (this.state.isEditing) {
      this.save()
    }

    this.setState({
      isEditing: !this.state.isEditing
    })
  }

  save () {
    console.log('saving ', this.props.user)
    console.log(this.refs.userSettings.getSettings())
    this.props.updateUser(this.props.user, this.refs.userSettings.getSettings())
  }

  render () {
    return (
      <Panel bsStyle='primary' collapsible expanded={this.state.isEditing} header={
        <Row>
          <Col xs={8}>
            <h4>{this.props.user.email}</h4>
          </Col>
          <Col xs={4}>
            <Button className='pull-right' onClick={this.toggleExpansion.bind(this)}>
              {this.state.isEditing ? 'Save' : 'Edit'}
            </Button>
          </Col>
        </Row>
      }>
        <UserSettings ref='userSettings'
          projects={this.props.projects}
          userPermissions={this.props.user.userPermissions}
        />
      </Panel>
    )
  }
}
