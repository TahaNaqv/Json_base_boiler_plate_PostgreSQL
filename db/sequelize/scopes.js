module.exports = function (models) {
    const { users, roles } = models;

    users.addScope('withRole', {
        include: [{ model: roles, as: 'role' }],
    });

    users.addScope('active', {
        where: { status: 'active' },
    });
};
