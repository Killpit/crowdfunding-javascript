const { expect } = require("chai");
const { ethers } = require("hardhat");

const etherToWei = (n) => {
    return ethers.utils.parseUnits(n, 'ether')
}

const dateToUNIX = (date) => {
    return Math.round(new Date(date).getTime() / 1000)
}

describe("Crowdfunding", () => {
    var address1;
    var address2;
    var crowdfundingContract;

    beforeEach(async function () {
        [address1, address2, ...address] = await ethers.getSigners();

        const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
        crowdfundingContract = await Crowdfunding.deploy();
    })

    describe("Request for funding", async function () {
        it("Start a project", async function () {
            const minimumContribution = etherToWei('10');
            const deadline = dateToUNIX('2023-02-21');
            const targetContribution = etherToWei('100000');
            const projectTitle = 'Testing title';
            const projectDesc = 'Testing description';

            const project = await crowdfundingContract.connect(address1).createProject(minimumContribution, deadline, targetContribution, projectTitle, projectDesc)
            const event = await project.wait();

            const projectList = await crowdfundingContract.returnAllProjects();

            expect(event.events.length).to.equal(1);
            expect(event.events[0].event).to.equal("ProjectStarted");
            expect(event.events[0].args.projectContractAddress).to.equal(projectList[0]);
            expect(event.events[0].args.creator).to.equal(address1.address);
            expect(event.events[0].args.minContribution).to.equal(minimumContribution);
            expect(Number(event.events[0].args.projectDeadline)).to.greaterThan(0);
            expect(event.events[0].args.goalAmount).to.equal(targetContribution);
            expect(event.events[0].args.currentAmount).to.equal(0);
            expect(event.events[0].args.noOfContributors).to.equal(0);
            expect(event.events[0].args.title).to.equal(projectTitle);
            expect(event.events[0].args.desc).to.equal(projectDesc);
            expect(event.events[0].args.currentState).to.equal(0);
        });

        it("Get data", async function () {
            const minimumContribution = etherToWei('10');
            const deadline = dateToUNIX('2023-02-21');
            const targetContribution = etherToWei('100000');
            const projectTitle = 'Testing title';
            const projectDesc = 'Testing description';

            await crowdfundingContract.connect(address1).createProject(minContribution, deadline, targetContribution, projectTitle, projectDesc)
            const projectList = await crowdfundingContract.returnAllProjects();
            const contribute = await crowdfundingContract.connect(address1).contribute(projectList[0], {value: etherToWei("20")});

            const event = await contribute.wait();

            expect(event.events.length).to.equal(2);
            expect(event.events[1].event).to.equal("ContributionReceived");
            expect(event.events[1].args.projectAddress).to.equal(projectList[0]);
            expect(event.events[1].args.contributedAmount).to.equal(etherToWei("20"));
            expect(event.events[1].args.contributor).to.equal(address1.address);

        })
    })
})